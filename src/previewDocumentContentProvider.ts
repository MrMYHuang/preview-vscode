"use strict";
import { workspace, window, ExtensionContext, commands,
    TextEditor, TextDocumentContentProvider, EventEmitter,
    Event, Uri, TextDocumentChangeEvent, ViewColumn,
    TextEditorSelectionChangeEvent,
    TextDocument, Disposable } from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as documentContentManagerInterface from "./documentContentManagerInterface";
import * as htmlDocumentContentManager from "./htmlDocumentContentManager";
import * as markdownDocumentContentManager from "./markdownDocumentContentManager";
import * as imageDocumentContentManager from "./imageDocumentContentManager";
let fileUrl = require("file-url");
enum TextDocumentType {
    HTML,
    MARKDOWN
}

export class PreviewDocumentContentProvider implements TextDocumentContentProvider {
    static PREVIEW_SCHEME: string = "vscode-preview";
    // 观察者模式，生成一个事件发生器
    private _onDidChange = new EventEmitter<Uri>();
    private _htmlDocumentContentManager = new htmlDocumentContentManager.HtmlDocumentContentManager();
    private _markdownDocumentContentManager = new markdownDocumentContentManager.MarkdownDocumentContentManager();
    private _imageDocumentContentManager = new imageDocumentContentManager.ImageDocumentContentManager();

    private _documentContentManager: documentContentManagerInterface.DocumentContentManager = this._markdownDocumentContentManager;

    static get previewScheme(): string {
        return PreviewDocumentContentProvider.PREVIEW_SCHEME;
    }

    private refreshCurrentDocumentContentProvide() {
        let editor = window.activeTextEditor;
        switch (editor.document.languageId) {
            case "html":
            case "jade":
                this._documentContentManager = this._htmlDocumentContentManager;
                break;
            case "markdown":
                this._documentContentManager = this._markdownDocumentContentManager;
                break;
            default:
                // window.showWarningMessage(editor.document.languageId);
                this._documentContentManager = this._imageDocumentContentManager;
                break;
        }

    }
    // @Override 生成当前html规范化的代码文本，编辑器会自动根据该函数的返回值创建一个只读文档
    // uri是scheme
    public provideTextDocumentContent(uri: Uri): string {
        this.refreshCurrentDocumentContentProvide();
        return this._documentContentManager.createContentSnippet();
    }

    // @Override 获取文档变化这个监听事件，给vscode调用
    // 该事件用来向外公开观察者模式，外部监听者通过该接口注册监听，获知文档的变动情况
    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    // 通知监听者发生待预览HTML文本变化事件
    public update() {
        let previewUri: Uri = PreviewDocumentContentProvider.getPreviewUri();
        this._onDidChange.fire(previewUri);
    }

    public sendPreviewCommand(displayColumn: ViewColumn): Thenable<void> {

        this.refreshCurrentDocumentContentProvide();
        // 生成预览临时文件的URI
        let previewUri: Uri = PreviewDocumentContentProvider.getPreviewUri();

        return this._documentContentManager.sendPreviewCommand(previewUri, displayColumn);

    }

    static getPreviewTitle(): string {
        return `Preview: '${path.basename(window.activeTextEditor.document.fileName)}'`;
    }
    static getPreviewUri(): Uri {
        // 预览窗口标题
        let previewTitle = this.getPreviewTitle();
        return Uri.parse(`${PreviewDocumentContentProvider.previewScheme}://preview/${previewTitle}`);
    }
}
