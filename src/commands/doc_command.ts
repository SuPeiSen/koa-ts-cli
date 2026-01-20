import { DocService } from "../services/doc_service.js";

export class DocCommand {
    /**
     * 执行生成 API 文档命令。
     * 实际上委托给 DocService.generate()。
     */
    static async execute() {
        await DocService.generate();
    }
}
