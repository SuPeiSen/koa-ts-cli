// documentation-generator.js
import fs from "node:fs/promises";
import path from "node:path";
import { glob } from "glob";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generator from "@babel/generator";
import _template from "@babel/template";
import prettier from "prettier";
import { createRequire } from "node:module";
import t from "@babel/types";
import { execSync } from "child_process";

// @ts-ignore
const traverse = _traverse.default;
// @ts-ignore
const template = _template.default;
// @ts-ignore
const generator = _generator.default;

/**
 * @typedef {Map<string, { functionName: string, method: string, path: string, authRequired: boolean, apiPrePath: string }>} RouteConfig
 * @typedef {{ className: string, routeConfig: RouteConfig, functionNames: string[] }} ClassMetadata
 * @typedef {{ className: string, classObject: object, functionNames: string[] }} DocumentationMetadata
 */

/** @constant {object} CONFIG - 全局配置常量 */
const CONFIG = {
  CONTROLLER_DIR: path.join(process.cwd(), "src", "controller"),
  DOCUMENTATION_DIR: path.join(process.cwd(), "doc"),
  DEFAULT_TEMPLATE: template.statement(`
    return {
      method: %%METHOD%%,
      description: '',
      path: %%PATH%%,
      authRequired: %%AUTH_REQUIRED%%,
      apiPrePath: %%API_PRE_PATH%%,
      request: {
        header: { 
          'Content-Type': 'application/json', 
          Authorization: '' 
        },
        body: {},
        query: {}
      },
      response: { 
        body: {} 
      }
    };
  `),
};

/**
 * 主函数：生成文档
 * @returns {Promise<void>}
 */
export async function generateDocumentation() {
  await import("ts-node").then(async (tsNode) => {
    tsNode.register({
      transpileOnly: true,
    });
    await import("tsconfig-paths/register.js");
    try {
      const controllerFiles = await glob(`${CONFIG.CONTROLLER_DIR}/**/*.ts`, {
        nodir: true,
        ignore: "**/*.d.ts",
      });

      for (const controllerFile of controllerFiles) {
        await processControllerFile(controllerFile);
      }

      // 格式化文档
      execSync(`npx prettier --write ${CONFIG.DOCUMENTATION_DIR}/**/*.ts`);
    } catch (error) {
      console.error("文档生成失败:", error);
      process.exit(1);
    }
  });
}

/**
 * 处理单个控制器文件
 * @param {string} controllerPath - 控制器文件路径
 * @returns {Promise<void>}
 */
async function processControllerFile(controllerPath) {
  const relativePath = path.relative(CONFIG.CONTROLLER_DIR, controllerPath);
  const docPath = path.join(CONFIG.DOCUMENTATION_DIR, relativePath);

  const controllerMeta = await extractControllerMetadata(controllerPath);
  if (controllerMeta) {
    await ensureDocumentationFile(docPath, controllerMeta);

    const docMeta = await extractDocumentationMetadata(docPath);

    const { functionsToAdd, functionsToRemove } = compareMethods(
      controllerMeta.functionNames,
      docMeta.functionNames
    );

    if (functionsToAdd.length > 0 || functionsToRemove.length > 0) {
      await updateDocumentationFile(docPath, functionsToAdd, functionsToRemove);
    }
  }
}

/**
 * 确保文档文件存在
 * @param {string} filePath - 目标文件路径
 * @param {ClassMetadata} controllerMeta - 控制器元数据
 * @returns {Promise<void>}
 */
async function ensureDocumentationFile(filePath, controllerMeta) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const content = createClassWithMethods(controllerMeta);
    const formattedCode = await formatCode(content);
    await fs.writeFile(filePath, formattedCode);
  }
}

/**
 * 比较方法差异
 * @param {string[]} current - 当前方法列表
 * @param {string[]} existing - 现有方法列表
 * @returns {{ functionsToAdd: string[], functionsToRemove: string[] }} - 差异结果
 */
function compareMethods(current, existing) {
  return {
    functionsToAdd: current.filter((f) => !existing.includes(f)),
    functionsToRemove: existing.filter((f) => !current.includes(f)),
  };
}

/**
 * 更新文档文件
 * @param {string} filePath - 文件路径
 * @param {string[]} functionsToAdd - 需要添加的方法列表
 * @param {string[]} functionsToRemove - 需要删除的方法列表
 * @returns {Promise<void>}
 */
async function updateDocumentationFile(
  filePath,
  functionsToAdd,
  functionsToRemove
) {
  const originalCode = await fs.readFile(filePath, "utf8");
  const modifiedCode = modifyClassMethods(
    originalCode,
    functionsToAdd,
    functionsToRemove
  );
  const formattedCode = await formatCode(modifiedCode);
  await fs.writeFile(filePath, formattedCode);
}

/**
 * 修改类方法（核心AST操作）
 * @param {string} code - 原始代码
 * @param {string[]} functionsToAdd - 需要添加的方法列表
 * @param {string[]} functionsToRemove - 需要删除的方法列表
 * @returns {string} 修改后的代码
 */
function modifyClassMethods(code, functionsToAdd, functionsToRemove) {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "classProperties", "decorators-legacy"],
  });

  traverse(ast, {
    ClassDeclaration(path) {
      // 移除旧方法
      path.node.body.body = path.node.body.body.filter((node) => {
        return !(
          node.type === "ClassMethod" &&
          functionsToRemove.includes(node.key.name)
        );
      });

      // 添加新方法
      functionsToAdd.forEach((methodName) => {
        const methodNode = createMethodNode(methodName);
        path.node.body.body.unshift(methodNode);
      });
    },
  });

  return generator(ast, {
    retainLines: true,
    comments: true,
    jsescOption: { minimal: true },
  }).code;
}

/**
 * 创建方法节点
 * @param {string} methodName - 方法名称
 * @returns {object} AST方法节点
 */
function createMethodNode(methodName) {
  const methodBody = CONFIG.DEFAULT_TEMPLATE({
    PATH: { type: "StringLiteral", value: `/${methodName}` },
    METHOD: { type: "StringLiteral", value: "get" },
    AUTH_REQUIRED: { type: "BooleanLiteral", value: false },
    API_PRE_PATH: { type: "StringLiteral", value: "" },
  });

  // 创建方法节点
  return t.classMethod(
    "method",
    t.identifier(methodName), // 方法名
    [], // 参数列表
    t.blockStatement([methodBody]) // 方法体
  );
}

/**
 * 代码格式化
 * @param {string} code - 原始代码
 * @returns {Promise<string>} 格式化后的代码
 */
async function formatCode(code) {
  const config = await prettier.resolveConfig(process.cwd());
  return prettier.format(code, {
    ...config,
    parser: "typescript",
  });
}

/**
 * 从控制器文件提取元数据
 * @param {string} filePath - 控制器文件路径
 * @returns {Promise<ClassMetadata | undefined>} 类元数据
 */
async function extractControllerMetadata(filePath) {
  const require = createRequire(import.meta.url);
  const moduleData = require(filePath);
  const mainClass = moduleData.default;

  if (typeof mainClass !== "function" || !mainClass.prototype) {
    throw new Error(`No class found in ${filePath}`);
  }

  if (!mainClass.routesMap) {
    return;
  }

  return {
    className: mainClass.name,
    routeConfig: mainClass.routesMap,
    functionNames: Array.from(mainClass.routesMap.values()).map(
      (config) => config.functionName
    ),
  };
}

/**
 * 创建包含指定方法的类
 * @param {ClassMetadata} controllerMeta - 控制器元数据
 * @returns {string} 生成的代码
 */
function createClassWithMethods(controllerMeta) {
  const { functionNames, className, routeConfig } = controllerMeta;

  // 创建类属性节点
  const descProperty = t.classProperty(
    t.identifier("desc"),
    t.stringLiteral(""),
    null,
    null,
    false,
    true
  );

  // 创建类方法节点
  const methods = functionNames.map((methodName) => {
    const {
      method = "get",
      path = `/${methodName}`,
      authRequired = false,
      apiPrePath = "",
    } = routeConfig.get(methodName) ?? {};

    const apiPath = `/${className.toLowerCase()}${path}`;

    // 生成方法体AST
    const methodBody = CONFIG.DEFAULT_TEMPLATE({
      PATH: t.stringLiteral(apiPath), // 动态注入路径
      METHOD: { type: "StringLiteral", value: method },
      AUTH_REQUIRED: { type: "BooleanLiteral", value: authRequired },
      API_PRE_PATH: { type: "StringLiteral", value: apiPrePath },
    });

    return t.classMethod(
      "method",
      t.identifier(methodName),
      [],
      t.blockStatement([methodBody])
    );
  });

  // 创建类节点
  const classNode = t.classDeclaration(
    t.identifier(className),
    null,
    t.classBody([descProperty, ...methods]),
    []
  );

  // 构建程序并导出
  const ast = t.program([t.exportDefaultDeclaration(classNode)]);

  // 生成代码
  return generator(ast, {
    retainLines: true,
    jsescOption: { minimal: true },
  }).code;
}

/**
 * 从文档文件提取元数据
 * @param {string} filePath - 文档文件路径
 * @returns {Promise<DocumentationMetadata>} 文档元数据
 */
async function extractDocumentationMetadata(filePath) {
  const require = createRequire(import.meta.url);
  const moduleData = require(filePath);
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

export default generateDocumentation;
