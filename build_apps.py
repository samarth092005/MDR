import os, json, shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def package_app(app_folder, namespace):
    app_path = os.path.join(BASE_DIR, 'app', app_folder)
    webapp_path = os.path.join(app_path, 'webapp')
    dist_path = os.path.join(app_path, 'dist')
    
    print(f"\n==========================================")
    print(f"Packaging {app_folder} -> {namespace}")
    print(f"==========================================")
    
    # 1. Clean and copy webapp to dist
    if os.path.exists(dist_path):
        shutil.rmtree(dist_path)
    shutil.copytree(webapp_path, dist_path, ignore=shutil.ignore_patterns('test', 'localService', '*dbg*'))
    
    # 2. Copy xs-app.json to dist
    xs_source = os.path.join(app_path, 'xs-app.json')
    if os.path.exists(xs_source):
        shutil.copy2(xs_source, os.path.join(dist_path, 'xs-app.json'))
        print(f"Copied xs-app.json to dist")
    
    # Ensure i18n_en.properties exists in dist
    dist_i18n = os.path.join(dist_path, 'i18n', 'i18n.properties')
    dist_i18n_en = os.path.join(dist_path, 'i18n', 'i18n_en.properties')
    if os.path.exists(dist_i18n) and not os.path.exists(dist_i18n_en):
        shutil.copy2(dist_i18n, dist_i18n_en)
        print(f"Copied i18n.properties to i18n_en.properties in dist")
    
    # 3. Build sap.ui.require.preload bundle
    entries = []
    for root, dirs, files in os.walk(webapp_path):
        rel_root = os.path.relpath(root, webapp_path).replace('\\', '/')
        if rel_root.startswith('test') or rel_root.startswith('localService') or 'backup' in rel_root:
            continue
            
        for file in files:
            if file.startswith('.') or file == 'Component-preload.js' or file.endswith('.map') or file.endswith('-dbg.js') or file == 'index.html':
                continue
                
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, webapp_path).replace('\\', '/')
            key = f"{namespace}/{rel_path}"
            
            if file.endswith('.js'):
                content = open(file_path, encoding='utf-8').read()
                entry = f'\t"{key}":function(){{\n{content}\n}}'
                entries.append(entry)
            elif file.endswith('.xml') or file.endswith('.properties') or file.endswith('.json'):
                content = open(file_path, encoding='utf-8').read()
                escaped = json.dumps(content)
                entry = f'\t"{key}":{escaped}'
                entries.append(entry)
                if rel_path in ['i18n/i18n.properties', 'i18n/i18n_en.properties', 'manifest.json']:
                    entries.append(f'\t"{rel_path}":{escaped}')
    
    preload_content = (
        f"//@ui5-bundle {namespace}/Component-preload.js\n"
        f"sap.ui.require.preload({{\n"
        + ",\n".join(entries)
        + "\n});\n"
    )
    
    preload_file = os.path.join(dist_path, 'Component-preload.js')
    with open(preload_file, 'w', encoding='utf-8') as f:
        f.write(preload_content)
    
    print(f"Generated {preload_file} with {len(entries)} modules ({len(preload_content)} bytes)")

    # 4. Create zip archive
    zip_base = os.path.join(app_path, app_folder)
    shutil.make_archive(zip_base, 'zip', dist_path)
    print(f"Created {zip_base}.zip")

    ui_deployer_res = os.path.join(BASE_DIR, 'ui-deployer', 'resources')
    if os.path.exists(ui_deployer_res):
        shutil.copy2(f"{zip_base}.zip", os.path.join(ui_deployer_res, f"{app_folder}.zip"))
        print(f"Copied to ui-deployer/resources/{app_folder}.zip")

# Package all 7 HTML5 apps
apps = [
    ('zmdr_cntrl_main', 'com/intapptics/zmdrcntrlmain'),
    ('zmdr_adminconsole', 'com/intapptics/zmdradminconsole'),
    ('zmdr_cntrl_cmn', 'com/intapptics/zmdrcntrlcmn'),
    ('zmdr_account_report', 'com/intapptics/zmdraccountreport'),
    ('zmdr_bulkapprover', 'com/intapptics/zmdrbulkapprover'),
    ('zmdr_bulkload', 'com/intapptics/zmdrbulkload'),
    ('zmdr_wfauditrep', 'com/intapptics/zmdrwfauditrep')
]

for app_folder, ns in apps:
    package_app(app_folder, ns)

print("\nAll 7 apps packaged successfully into classic sap.ui.require.preload format!")
