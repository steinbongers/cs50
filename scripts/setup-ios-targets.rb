# Zet de native onderdelen in het Xcode-project, zodat dat niet met de hand in Xcode hoeft:
# - de eigen Swift-bestanden bij de app (plugins, meldingen, Apple Pay-actie)
# - App Group en Push Notifications (App.entitlements)
# - het widget-target FinanceWidget en het target NotificationService, ingebed in de app
#
# Herhaalbaar: wat er al staat, blijft staan. Draaien (CocoaPods levert de xcodeproj-gem):
#   GEM_HOME="$(ls -d /opt/homebrew/Cellar/cocoapods/*/libexec | tail -1)" \
#     /opt/homebrew/opt/ruby/bin/ruby scripts/setup-ios-targets.rb
#
# Het ontwikkelteam (DEVELOPMENT_TEAM) staat bewust niet in de repo. Met TEAM=XXXXXXXXXX in de
# omgeving zet het script hem lokaal op alle targets.
gem "xcodeproj"
require "xcodeproj"

ROOT = File.expand_path("../ios/App", __dir__)
project = Xcodeproj::Project.open(File.join(ROOT, "App.xcodeproj"))
app = project.targets.find { |t| t.name == "App" } or abort "Target App niet gevonden"
app_group = project.main_group.children.find { |g| g.respond_to?(:path) && g.path == "App" && g.isa == "PBXGroup" } or abort "Groep App niet gevonden"
BUNDLE_ID = app.build_configurations.first.build_settings["PRODUCT_BUNDLE_IDENTIFIER"]
VERSION = app.build_configurations.first.build_settings["MARKETING_VERSION"] || "1.0"
BUILD = app.build_configurations.first.build_settings["CURRENT_PROJECT_VERSION"] || "1"

def file_ref(group, name)
  group.files.find { |f| f.path == name } || group.new_reference(name)
end

def add_source(target, ref)
  target.source_build_phase.add_file_reference(ref, true)
end

# --- App: eigen Swift-bestanden en entitlements --------------------------------------------
app_sources = %w[
  MainViewController.swift BiometricLockPlugin.swift WidgetBridgePlugin.swift
  NativeShared.swift NativePushPlugin.swift PaymentNotifications.swift PaymentIntent.swift
]
app_sources.each { |name| add_source(app, file_ref(app_group, name)) }
file_ref(app_group, "App.entitlements")
app.build_configurations.each { |c| c.build_settings["CODE_SIGN_ENTITLEMENTS"] = "App/App.entitlements" }
shared_ref = file_ref(app_group, "NativeShared.swift")

# --- Extensies ----------------------------------------------------------------------------
def extension_target(project, app, name:, group_path:, sources:, extra_sources: [], deployment:, bundle_id:, entitlements: nil)
  target = project.targets.find { |t| t.name == name }
  unless target
    target = project.new_target(:app_extension, name, :ios, deployment, nil, :swift)
    # new_target koppelt Foundation uit een SDK-pad dat per Xcode-versie verschilt; Swift linkt zelf.
    target.frameworks_build_phase.files.to_a.each { |f| f.file_ref&.remove_from_project; f.remove_from_project }
  end
  group = project.main_group.children.find { |g| g.isa == "PBXGroup" && g.path == group_path } ||
          project.main_group.new_group(name, group_path)
  sources.each { |s| add_source(target, file_ref(group, s)) }
  extra_sources.each { |ref| add_source(target, ref) }
  file_ref(group, "Info.plist")
  file_ref(group, File.basename(entitlements)) if entitlements
  target.build_configurations.each do |c|
    s = c.build_settings
    s["PRODUCT_BUNDLE_IDENTIFIER"] = bundle_id
    s["PRODUCT_NAME"] = "$(TARGET_NAME)"
    s["INFOPLIST_FILE"] = "#{group_path}/Info.plist"
    s["GENERATE_INFOPLIST_FILE"] = "NO"
    s["IPHONEOS_DEPLOYMENT_TARGET"] = deployment
    s["SWIFT_VERSION"] = "5.0"
    s["TARGETED_DEVICE_FAMILY"] = "1,2"
    s["CODE_SIGN_STYLE"] = "Automatic"
    s["MARKETING_VERSION"] = VERSION
    s["CURRENT_PROJECT_VERSION"] = BUILD
    s["SKIP_INSTALL"] = "YES"
    s["APPLICATION_EXTENSION_API_ONLY"] = "YES"
    s["LD_RUNPATH_SEARCH_PATHS"] = ["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"]
    s["CODE_SIGN_ENTITLEMENTS"] = entitlements if entitlements
    s["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "DEBUG" if c.name == "Debug"
  end
  app.add_dependency(target) unless app.dependencies.any? { |d| d.target == target }
  target
end

widget = extension_target(
  project, app,
  name: "FinanceWidget", group_path: "Widget", sources: ["FinanceWidget.swift"], extra_sources: [shared_ref],
  deployment: "17.0", bundle_id: "#{BUNDLE_ID}.FinanceWidget", entitlements: "Widget/FinanceWidget.entitlements"
)
service = extension_target(
  project, app,
  name: "NotificationService", group_path: "NotificationService", sources: ["NotificationService.swift"],
  deployment: "15.0", bundle_id: "#{BUNDLE_ID}.NotificationService"
)

# --- Extensies inbedden in de app -------------------------------------------------------------
embed = app.copy_files_build_phases.find { |p| p.name == "Embed Foundation Extensions" } ||
        app.new_copy_files_build_phase("Embed Foundation Extensions")
embed.symbol_dst_subfolder_spec = :plug_ins
[widget, service].each do |t|
  next if embed.files_references.include?(t.product_reference)
  build_file = embed.add_file_reference(t.product_reference, true)
  build_file.settings = { "ATTRIBUTES" => ["RemoveHeadersOnCopy"] }
end

# --- Ontwikkelteam (alleen lokaal, niet in de repo) --------------------------------------------
if (team = ENV["TEAM"]) && team =~ /\A[A-Z0-9]{10}\z/
  project.targets.each { |t| t.build_configurations.each { |c| c.build_settings["DEVELOPMENT_TEAM"] = team } }
end

project.save
puts "Klaar: #{project.targets.map(&:name).join(', ')}"
