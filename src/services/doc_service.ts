import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generator from "@babel/generator";
import _template from "@babel/template";
import _types from "@babel/types";
import prettier from "prettier";
import { createJiti } from "jiti";
import { Logger } from "../core/logger.js";
import "reflect-metadata";

// @ts-ignore
const traverse = _traverse.default;
// @ts-ignore
const template = _template.default;
// @ts-ignore
const generator = _generator.default;
const t = _types;

interface RouteConfigItem {
    functionName: string;
    method: string;
    path: string;
    authRequired: boolean;
    apiPrePath: string;
}
type RouteConfig = Map<string, RouteConfigItem>;
interface ClassMetadata {
    className: string;
    routeConfig: RouteConfig;
    functionNames: string[];
}
interface DocumentationMetadata {
    className: string;
    classObject: any;
    functionNames: string[];
}

export class DocService {
    private static CONFIG = {
        CONTROLLER_DIR: path.join(process.cwd(), "src", "controller"),
        DOCUMENTATION_DIR: path.join(process.cwd(), "doc"),
    };

    /**
     * 生成 API 文档的主要入口。
     * 1. 注册 jiti 以解析 TypeScript 文件。
     * 2. 扫描所有控制器文件。
     * 3. 处理每个控制器以提取路由信息。
     * 4. 格式化生成的文档。
     */
    static async generate() {
        Logger.startSpinner("Initializing documentation generator...");

        // Initialize jiti for loading TS files
        const jiti = createJiti(import.meta.url, {
            // interopDefault: true // Optional, jiti handles default exports well
        });

        try {
            // @ts-ignore
            await import("tsconfig-paths/register.js");
        } catch (e) {
            // Ignore if not present
        }

        try {
            const controllerFiles = await glob(`${this.CONFIG.CONTROLLER_DIR}/**/*.ts`, {
                nodir: true,
                ignore: "**/*.d.ts",
            });

            Logger.info(`Found ${controllerFiles.length} controllers.`);

            if (controllerFiles.length === 0) {
                Logger.warn("No controllers found in src/controller. Skipping documentation generation.");
                return;
            }

            for (const controllerFile of controllerFiles) {
                await this.processControllerFile(controllerFile, jiti);
            }

            Logger.info("Formatting documentation...");
            const { execSync } = await import("child_process");
            try {
                execSync(`npx prettier --write ${this.CONFIG.DOCUMENTATION_DIR}/**/*.ts`, { stdio: 'ignore' });
            } catch (e) {
                Logger.warn("Prettier formatting failed (possibly no files generated).");
            }

            Logger.success("Documentation generated successfully! ✅");
        } catch (error) {
            Logger.error(error as Error);
            process.exit(1);
        }
    }

    /**
     * 处理单个控制器文件以生成或更新其文档。
     * @param controllerPath - 控制器文件的绝对路径。
     * @param jiti - jiti instance
     */
    private static async processControllerFile(controllerPath: string, jiti: any) {
        const relativePath = path.relative(this.CONFIG.CONTROLLER_DIR, controllerPath);
        const docPath = path.join(this.CONFIG.DOCUMENTATION_DIR, relativePath);

        const controllerMeta = await this.extractControllerMetadata(controllerPath, jiti);
        if (!controllerMeta) return;

        await this.ensureDocumentationFile(docPath, controllerMeta);

        const docMeta = await this.extractDocumentationMetadata(docPath, jiti);

        const { functionsToAdd, functionsToRemove } = this.compareMethods(
            controllerMeta.functionNames,
            docMeta.functionNames
        );

        if (functionsToAdd.length > 0 || functionsToRemove.length > 0) {
            Logger.info(`Updating ${docPath}: +${functionsToAdd.length}, -${functionsToRemove.length}`);
            await this.updateDocumentationFile(docPath, functionsToAdd, functionsToRemove, controllerMeta);
        }
    }

    /**
     * 确保文档文件存在。如果不存在，则使用初始元数据创建它。
     * @param filePath - 文档文件的路径。
     * @param controllerMeta - 从控制器提取的元数据。
     */
    private static async ensureDocumentationFile(filePath: string, controllerMeta: ClassMetadata) {
        try {
            await fs.access(filePath);
        } catch {
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            const content = this.createClassWithMethods(controllerMeta);
            const formattedCode = await this.formatCode(content);
            await fs.writeFile(filePath, formattedCode);
            Logger.success(`Created doc for ${controllerMeta.className}`);
        }
    }

    /**
     * 通过添加新方法或删除旧方法来更新现有的文档文件。
     * @param filePath - 文档文件路径。
     * @param functionsToAdd - 要添加的方法名称列表。
     * @param functionsToRemove - 要移除的方法名称列表。
     */
    private static async updateDocumentationFile(
        filePath: string,
        functionsToAdd: string[],
        functionsToRemove: string[],
        controllerMeta: ClassMetadata
    ) {
        const originalCode = await fs.readFile(filePath, "utf8");
        const modifiedCode = this.modifyClassMethods(
            originalCode,
            functionsToAdd,
            functionsToRemove,
            controllerMeta
        );
        const formattedCode = await this.formatCode(modifiedCode);
        await fs.writeFile(filePath, formattedCode);
    }

    private static compareMethods(current: string[], existing: string[]) {
        return {
            functionsToAdd: current.filter((f) => !existing.includes(f)),
            functionsToRemove: existing.filter((f) => !current.includes(f)),
        };
    }

    /**
     * 使用动态 require 从控制器文件中提取元数据（类名、路由）。
     * @param filePath - 控制器路径。
     * @returns 元数据，如果无效则返回 undefined。
     */
    private static async extractControllerMetadata(filePath: string, jiti: any): Promise<ClassMetadata | undefined> {
        try {
            // Use jiti to load file
            const moduleData = await jiti.import(filePath);
            const mainClass = moduleData.default;

            if (typeof mainClass !== "function" || !mainClass.prototype) {
                Logger.warn(`No default class export found in ${filePath}`);
                return undefined;
            }

            let routeConfigMap: Map<string, RouteConfigItem> | undefined;

            // Exclusive support for koa-ts-core metadata
            const metadataKeys = Reflect.getMetadataKeys(mainClass);
            const routeKey = metadataKeys.find((key) => String(key) === "Symbol(route_metadata)");

            if (routeKey) {
                const rawMap = Reflect.getMetadata(routeKey, mainClass);
                if (rawMap instanceof Map) {
                    routeConfigMap = rawMap as unknown as Map<string, RouteConfigItem>;
                }
            }

            if (!routeConfigMap || routeConfigMap.size === 0) {
                // If it's not a router controller, just ignore it.
                return undefined;
            }

            return {
                className: mainClass.name,
                routeConfig: routeConfigMap,
                functionNames: Array.from(routeConfigMap.values()).map(
                    (config) => config.functionName
                ),
            };
        } catch (error) {
            Logger.warn(`Failed to load controller metadata for ${filePath}: ${(error as Error).message}`);
            return undefined;
        }
    }

    private static async extractDocumentationMetadata(filePath: string, jiti: any): Promise<DocumentationMetadata> {
        const moduleData = await jiti.import(filePath);
        const mainClass = moduleData.default;

        if (typeof mainClass !== "function" || !mainClass.prototype) {
            throw new Error(`No class found in ${filePath}`);
        }

        const prototype = mainClass.prototype;
        const functionNames = Object.getOwnPropertyNames(prototype).filter(
            (name) => typeof prototype[name] === "function" && name !== "constructor"
        );

        return {
            className: mainClass.name,
            classObject: mainClass,
            functionNames,
        };
    }

    private static createClassWithMethods(controllerMeta: ClassMetadata): string {
        const { functionNames, className, routeConfig } = controllerMeta;

        const descProperty = t.classProperty(
            t.identifier("desc"),
            t.stringLiteral(""),
            null,
            null,
            false, // computed
            true // static
        );

        const importDecl = t.importDeclaration(
            [t.importSpecifier(t.identifier("ApiDoc"), t.identifier("ApiDoc"))],
            t.stringLiteral("koa-ts-core")
        );

        const methods = functionNames.map((methodName) => {
            const config = routeConfig.get(methodName);
            const method = config?.method || "get";
            const pathStr = config?.path || `/${methodName}`;
            const authRequired = config?.authRequired || false;

            return this.createMethodNode(methodName, pathStr, method, authRequired);
        });

        const classNode = t.classDeclaration(
            t.identifier(className),
            null,
            t.classBody([descProperty, ...methods]),
            []
        );

        const ast = t.program([importDecl, t.exportDefaultDeclaration(classNode)]);

        return generator(ast, {
            retainLines: true,
            jsescOption: { minimal: true },
            // @ts-ignore
            comments: true,
        }).code;
    }

    private static modifyClassMethods(
        code: string,
        functionsToAdd: string[],
        functionsToRemove: string[],
        controllerMeta: ClassMetadata
    ): string {
        const ast = parse(code, {
            sourceType: "module",
            plugins: ["typescript", "classProperties", "decorators-legacy"],
        });

        traverse(ast, {
            ClassDeclaration(path: any) {
                // Remove old methods
                path.node.body.body = path.node.body.body.filter((node: any) => {
                    return !(
                        node.type === "ClassMethod" &&
                        functionsToRemove.includes(node.key.name)
                    );
                });

                // Add new methods
                functionsToAdd.forEach((methodName) => {
                    const config = controllerMeta.routeConfig.get(methodName);
                    const method = config?.method || "get";
                    const pathStr = config?.path || `/${methodName}`;
                    const authRequired = config?.authRequired || false;

                    const methodNode = DocService.createMethodNode(methodName, pathStr, method, authRequired);
                    path.node.body.body.unshift(methodNode);
                });
            },
        });

        // Ensure Import
        let hasImport = false;
        traverse(ast, {
            ImportDeclaration(path: any) {
                if (path.node.source.value === "koa-ts-core") {
                    hasImport = true;
                    // Check if ApiDoc is imported
                    const hasApiDoc = path.node.specifiers.some((s: any) => t.isImportSpecifier(s) && (s.imported.type === "Identifier" ? s.imported.name : s.imported.value) === "ApiDoc");
                    if (!hasApiDoc) {
                        path.node.specifiers.push(t.importSpecifier(t.identifier("ApiDoc"), t.identifier("ApiDoc")));
                    }
                }
            }
        });

        if (!hasImport) {
            const importDecl = t.importDeclaration(
                [t.importSpecifier(t.identifier("ApiDoc"), t.identifier("ApiDoc"))],
                t.stringLiteral("koa-ts-core")
            );
            // @ts-ignore
            ast.program.body.unshift(importDecl);
        }

        return generator(ast, {
            retainLines: true,
            comments: true,
            jsescOption: { minimal: true },
        }).code;
    }

    private static createMethodNode(
        methodName: string,
        pathVal: string,
        methodVal: string,
        authRequired: boolean = false
    ) {
        const securityProp = authRequired ? "security: []," : "";
        const templateFn = template.statement(`
      return {
        method: %%METHOD%%,
        path: %%PATH%%,
        summary: '',
        tags: [],
        parameters: [],
        requestBody: { content: {} },
        responses: {},
        ${securityProp}
      };
    `);

        const methodBody = templateFn({
            PATH: t.stringLiteral(pathVal),
            METHOD: t.stringLiteral(methodVal)
        });

        const methodNode = t.classMethod(
            "method",
            t.identifier(methodName),
            [],
            t.blockStatement([methodBody as any]) // Template returns Statement, block needs Statement[]
        );

        methodNode.returnType = t.tsTypeAnnotation(
            t.tsTypeReference(t.identifier("ApiDoc"))
        );

        return methodNode;
    }

    private static async formatCode(code: string) {
        const config = await prettier.resolveConfig(process.cwd());
        return prettier.format(code, {
            ...config,
            parser: "typescript",
        });
    }
}
