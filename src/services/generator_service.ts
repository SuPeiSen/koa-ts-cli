import { join, dirname } from "path";
import { access, mkdir, writeFile, readFile } from "fs/promises";
import { Logger } from "../core/logger.js";
import { underscoreToPascalCase } from "../utils/string.js";

export class GeneratorService {
    /**
     * 生成控制器文件
     */
    static async generateController(
        name: string,
        outputDir: string,
        templatePath: string
    ) {
        const className = this.getClassName(name);
        const filePath = join(outputDir, `${name}.ts`);
        const templateContent = await readFile(join(templatePath, "controller.txt"), "utf8");

        await this.ensureFileExists(
            dirname(filePath),
            filePath,
            templateContent.replace(/{{Controller}}/g, className)
        );
    }

    /**
     * 生成校验器文件
     */
    static async generateValidator(
        name: string,
        outputDir: string,
        templatePath: string
    ) {
        const className = this.getClassName(name);
        const filePath = join(outputDir, `${name}.ts`);
        const templateContent = await readFile(join(templatePath, "validate.txt"), "utf8");

        await this.ensureFileExists(
            dirname(filePath),
            filePath,
            templateContent.replace(/{{Validate}}/g, className)
        );
    }

    /**
     * 从路径中提取类名并转为 PascalCase。
     */
    private static getClassName(name: string): string {
        const fileName = name.split("/").pop();
        if (!fileName) throw new Error("Invalid name");
        return underscoreToPascalCase(fileName);
    }

    /**
     * 确保文件存在，不存在则创建。
     * 如果文件已存在则发出警告。
     */
    private static async ensureFileExists(
        dirPath: string,
        filePath: string,
        content: string
    ) {
        try {
            await access(filePath);
            Logger.warn(`File already exists: ${filePath}`);
        } catch {
            try {
                await mkdir(dirPath, { recursive: true });
                await writeFile(filePath, content);
                Logger.success(`Created: ${filePath}`);
            } catch (error: any) {
                Logger.error(`Error creating file ${filePath}: ${error.message}`);
            }
        }
    }
}
