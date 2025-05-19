import inquirer from "inquirer";
import { join, dirname } from "path";
import { access, mkdir, writeFile, readFile } from "fs/promises";
import { underscoreToPascalCase } from "../utils/string.js";

const cwd = process.cwd();

/**
 * 添加控制器
 * @param {string} controllerName 控制器名称
 * @param {object} options 选项对象
 * @param {string} options.controller 控制器路径
 * @param {string} options.validate 校验器路径
 * @param {string} templatePath 模板路径
 */
async function addController(controllerName, options, templatePath) {
  // 获取用户是否希望添加验证逻辑的响应
  const { addValidate } = await inquirer.prompt([
    {
      type: "list",
      name: "addValidate",
      message: "Would you like to add validation?",
      choices: ["yes", "no"],
      when: !options.validate,
    },
  ]);

  // 如果用户选择添加验证，获取验证路径
  let validationPath;
  if (addValidate === "yes") {
    const { validatePath } = await inquirer.prompt([
      {
        type: "input",
        name: "validatePath",
        message: "Please input the validation path:",
      },
    ]);
    validationPath = validatePath;
  }

  const controllerFileName = controllerName.split("/").pop();
  if (!controllerFileName) throw new Error("Controller name is required");
  // 首字母大写
  const formattedName = underscoreToPascalCase(controllerFileName);

  // 构建控制器文件路径
  const srcDir = join(cwd, "src");
  const controllerDir = join(srcDir, options.controller || "controller");
  const controllerFilePath = join(controllerDir, `${controllerName}.ts`);
  // 创建控制器模板
  const controllerTemplatePath = join(templatePath, "controller.txt");
  const controllerTemplateContent = await readFile(
    controllerTemplatePath,
    "utf8"
  );
  // 确保控制器文件存在，创建文件如必要
  await ensureFileExists(
    dirname(controllerFilePath),
    controllerFilePath,
    controllerTemplateContent.replace(/{{Controller}}/g, formattedName)
  );

  // 如果需要添加验证，则构建验证文件路径
  if (addValidate === "yes" || options.validate) {
    const validateDir = join(
      srcDir,
      validationPath || options.validate || "validate"
    );
    // 创建校验器模板
    const validationFilePath = join(validateDir, `${controllerName}.ts`);
    const validationTemplatePath = join(templatePath, "validate.txt");
    const validationTemplateContent = await readFile(
      validationTemplatePath,
      "utf8"
    );

    // 确保验证文件存在，创建文件如必要
    await ensureFileExists(
      dirname(validationFilePath),
      validationFilePath,
      validationTemplateContent.replace(/{{Validate}}/g, formattedName)
    );
  }
}

/**
 * 确保文件存在
 * @param {string} dirPath 目录路径
 * @param {string} filePath 文件路径
 * @param {string} defaultContent 默认内容
 */
async function ensureFileExists(dirPath, filePath, defaultContent = "") {
  try {
    // 检查文件是否存在
    await access(filePath);
    console.log("File already exists:", filePath);
  } catch {
    try {
      // 检查目录是否存在，如果不存在，则创建目录
      await mkdir(dirPath, { recursive: true }); // 'recursive: true' 创建所有不存在的父目录
      // 创建文件并写入默认内容
      await writeFile(filePath, defaultContent);
      console.log("File created successfully:", filePath);
    } catch (error) {
      console.error("Error creating directory or file:", error.message);
    }
  }
}

export default addController;
