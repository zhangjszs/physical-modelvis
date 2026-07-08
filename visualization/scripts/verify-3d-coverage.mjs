import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const sceneRegistryPath = path.join(root, 'src/scenes/sceneRegistry.ts');
const rigIndexPath = path.join(root, 'src/components/simulation3d/rigs/index.ts');
const bundleDir = path.join(root, 'src/components/simulation3d/rigs/bundles');
const simulation3dDir = path.join(root, 'src/components/simulation3d');

function readSource(filePath) {
    return ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
}

function propertyName(node, sourceFile) {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
    return node.getText(sourceFile);
}

function unwrapExpression(node) {
    let current = node;
    while (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current) || ts.isParenthesizedExpression(current)) {
        current = current.expression;
    }
    return current;
}

function findVariableObject(sourceFile, variableName) {
    let found;
    function visit(node) {
        if (
            ts.isVariableDeclaration(node) &&
            node.name.getText(sourceFile) === variableName &&
            node.initializer
        ) {
            const expression = unwrapExpression(node.initializer);
            if (ts.isObjectLiteralExpression(expression)) found = expression;
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    return found;
}

function extractSceneIds() {
    const sourceFile = readSource(sceneRegistryPath);
    const ids = [];

    function visit(node) {
        if (
            ts.isVariableDeclaration(node) &&
            node.name.getText(sourceFile) === 'SCENES' &&
            node.initializer &&
            ts.isArrayLiteralExpression(node.initializer)
        ) {
            for (const item of node.initializer.elements) {
                if (!ts.isObjectLiteralExpression(item)) continue;
                const idProp = item.properties.find(
                    prop => ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === 'id'
                );
                if (idProp && ts.isPropertyAssignment(idProp) && ts.isStringLiteral(idProp.initializer)) {
                    ids.push(idProp.initializer.text);
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return ids;
}

function extractSceneToModule() {
    const sourceFile = readSource(rigIndexPath);
    const object = findVariableObject(sourceFile, 'SCENE_TO_MODULE');
    const routes = new Map();

    if (!object) return routes;
    for (const prop of object.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const key = propertyName(prop.name, sourceFile);
        const value = unwrapExpression(prop.initializer);
        if (ts.isStringLiteral(value)) routes.set(key, value.text);
    }

    return routes;
}

function extractBundleExports() {
    const bundles = new Map();
    const files = fs.readdirSync(bundleDir).filter(file => file.endsWith('.ts'));

    for (const file of files) {
        const filePath = path.join(bundleDir, file);
        const sourceFile = readSource(filePath);
        const moduleKey = file.replace(/Bundle\.ts$/, '');
        const sceneIds = [];

        function visit(node) {
            if (ts.isExportAssignment(node)) {
                const expression = unwrapExpression(node.expression);
                if (ts.isObjectLiteralExpression(expression)) {
                    for (const prop of expression.properties) {
                        if (ts.isPropertyAssignment(prop)) sceneIds.push(propertyName(prop.name, sourceFile));
                    }
                }
            }
            ts.forEachChild(node, visit);
        }

        visit(sourceFile);
        bundles.set(moduleKey, sceneIds);
    }

    return bundles;
}

function findPollutionFiles() {
    const hits = [];

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            const normalized = fullPath.split(path.sep).join('/');
            if (normalized.includes('/.omc/') || entry.name.includes('pre-tool')) {
                hits.push(path.relative(root, fullPath));
                if (entry.isDirectory()) continue;
            }
            if (entry.isDirectory()) walk(fullPath);
        }
    }

    walk(simulation3dDir);
    return hits;
}

function checkLoaderShape() {
    const text = fs.readFileSync(rigIndexPath, 'utf8');
    return {
        usesDynamicImport: /import\('\.\/bundles\//.test(text),
        readsDefaultExport: /module\.default/.test(text),
        avoidsUnknownCast: !/as\s+unknown\s+as/.test(text)
    };
}

function main() {
    const scenes = extractSceneIds();
    const sceneToModule = extractSceneToModule();
    const bundles = extractBundleExports();
    const bundleKeySet = new Set([...bundles.values()].flat());
    const errors = [];

    const missingRoutes = scenes.filter(sceneId => !sceneToModule.has(sceneId));
    if (missingRoutes.length > 0) errors.push(['Missing 3D route', missingRoutes]);

    const staleRoutes = [...sceneToModule.keys()].filter(sceneId => !scenes.includes(sceneId));
    if (staleRoutes.length > 0) errors.push(['Route points to non-existent scene', staleRoutes]);

    const missingBundleExports = [...sceneToModule.entries()]
        .filter(([sceneId, moduleKey]) => !(bundles.get(moduleKey) ?? []).includes(sceneId))
        .map(([sceneId, moduleKey]) => `${sceneId} -> ${moduleKey}`);
    if (missingBundleExports.length > 0) errors.push(['Route missing from bundle export', missingBundleExports]);

    const extraBundleExports = [...bundleKeySet].filter(sceneId => !sceneToModule.has(sceneId));
    if (extraBundleExports.length > 0) errors.push(['Bundle exports unregistered scene', extraBundleExports]);

    const pollutionFiles = findPollutionFiles();
    if (pollutionFiles.length > 0) errors.push(['Generated/state files under simulation3d', pollutionFiles]);

    const loaderShape = checkLoaderShape();
    if (!loaderShape.usesDynamicImport) errors.push(['Rig loader is not using dynamic import', []]);
    if (!loaderShape.readsDefaultExport) errors.push(['Rig loader does not read bundle default export', []]);
    if (!loaderShape.avoidsUnknownCast) errors.push(['Rig loader still uses as unknown as cast', []]);

    const bundleCounts = Object.fromEntries([...bundles.entries()].map(([key, ids]) => [key, ids.length]));
    const summary = {
        scenes: scenes.length,
        routed3d: sceneToModule.size,
        bundleCounts,
        loaderShape,
        pollutionFiles: pollutionFiles.length
    };

    console.log('3D coverage loop summary:');
    console.log(JSON.stringify(summary, null, 2));

    if (errors.length > 0) {
        console.error('\n3D coverage loop failed:');
        for (const [title, items] of errors) {
            console.error(`\n- ${title}`);
            for (const item of items) console.error(`  - ${item}`);
        }
        process.exit(1);
    }

    console.log('\nAll scenes are routed to 3D lazy-loaded rigs.');
}

main();
