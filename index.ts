import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

const targetDir = path.resolve(process.argv[2] || process.cwd());
const HBM_DIR = targetDir;
const targetFile = process.argv[3];
const OUTPUT_FILE = path.join(process.cwd(), targetFile || 'data-dictionary.md');

console.log(`\n=== Hibernate Data Model Extractor ===`);

console.log(`Searching directories: ${targetDir}`);

if (!fs.existsSync(targetDir)) {
    console.error(`ERROR: Path does not exists.`);
    process.exit(1);
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: true,
    // Garante que o texto dentro de tags com atributos seja capturado na chave '#text'
    textNodeName: "textContent" 
});

// Helper para extrair o valor textual de forma pragmática
const getCleanVal = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (val.name) return val.name; // Para casos de <column name="ID">
    if (val.textContent) return val.textContent;
    return '';
};

// Helper específico para o tipo Hibernate
const getTypeVal = (prop: any): string => {
    const type = prop.type;
    if (!type) return prop.class ? `FK: ${prop.class.split('.').pop()}` : '';
    if (typeof type === 'string') return type.split('.').pop() || '';
    // Caso de Enum do AndroMDA
    if (type.param && type.param.enumClassName) {
        return `Enum: ${type.param.enumClassName.split('.').pop()}`;
    }
    if (type.name) return type.name.split('.').pop() || '';
    return 'unknown';
};

function getFilesRecursively(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    list.forEach( (file: any) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else if (file.toLowerCase().endsWith('.hbm.xml')) {
            results.push(filePath);
        }
    });
    return results;
}

function parse() {
    console.log(`Lendo arquivos .hbm.xml de: ${HBM_DIR}`);

    const files = getFilesRecursively(targetDir);
    console.log(`Found: ${files.length} files`);

    let markdown = `# Data Dictionary\n\n`;

    files.forEach( (file: any) => {
        const content = fs.readFileSync(file as string, 'latin1');
        const jsonObj = parser.parse(content);
        const hbmClass = jsonObj['hibernate-mapping']?.class;

        if (!hbmClass) return;

        const entityName = getCleanVal(hbmClass.name).split('.').pop();
        const tableName = getCleanVal(hbmClass.table);

        const fullClassName = hbmClass.name;
        const javaFilePath = fullClassName.replace(/\./g, '/') + ".java";

        // Extração do descritor da ENTIDADE
        const entityMeta = Array.isArray(hbmClass.meta) ? hbmClass.meta : [hbmClass.meta];
        const entityDesc = entityMeta.find((m: any) => m?.attribute === 'class-description' || m?.attribute === 'description');
        const entityDoc = entityDesc ? getCleanVal(entityDesc).replace(/TODO: .*/gi, '').trim() : 'Sem descrição';

        markdown += `## Entity: ${entityName} (Table: ${tableName})\n`;
        markdown += `> **Java Class:** \`src/main/java/${javaFilePath}\` ou \`src/gen/java/${javaFilePath}\`\n`;        
        markdown += `> **Description:** ${entityDoc}\n\n`;
        markdown += `| Attribute | Column | Type / Destiny | Description |\n`;
        markdown += `| :--- | :--- | :--- | :--- |\n`;

        // Processamento da PK
        const id = hbmClass.id;
        const pkCol = getCleanVal(id.column) || getCleanVal(id.name);
        markdown += `| **${getCleanVal(id.name)}** (PK) | \`${pkCol}\` | ${getTypeVal(id)} | - |\n`;

        // Unifica propriedades e relacionamentos
        const props = [
            ...(Array.isArray(hbmClass.property) ? hbmClass.property : [hbmClass.property]),
            ...(Array.isArray(hbmClass['many-to-one']) ? hbmClass['many-to-one'] : [hbmClass['many-to-one']])
        ].filter(Boolean);

        props.forEach(p => {
            const colName = getCleanVal(p.column) || getCleanVal(p.name);
            
            // Lógica aprimorada para Tipo ou FK
            let typeInfo = getTypeVal(p);
            if (p.class) { // Se for um many-to-one, o atributo 'class' indica a FK
                const targetEntity = p.class.split('.').pop();
                typeInfo = `FK: ${targetEntity}`;
            }

            const metaArray = Array.isArray(p.meta) ? p.meta : [p.meta];
            const dTag = metaArray.find((m: any) => m?.attribute === 'field-description');
            const finalDesc = dTag ? getCleanVal(dTag).replace(/TODO: .*/gi, '').trim() : '-';

            markdown += `| ${getCleanVal(p.name)} | \`${colName}\` | ${typeInfo} | ${finalDesc} |\n`;
        });

        markdown += `\n---\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, markdown);
    console.log(`Markdown gerado: ${OUTPUT_FILE}`);
}

try {
    console.log("Iniciando extração...");
    parse(); // Sua função principal
    console.log("Processo finalizado com sucesso.");
} catch (err) {
    console.error("ERRO CRÍTICO NA EXECUÇÃO:");
    console.error(err);
    process.exit(1);
}
