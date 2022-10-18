// Daniel Jones - SFTS - 2022
// Main extension body. Handles communication between extension panel and everything else.

import * as vscode from "vscode";
import * as child_process from "child_process";
import fs = require("fs");
import { scriptText } from "./Event_Handler_Setup";
import { preLoadText } from "./Template_EHs/FLR_PreLoadEventHandler";
import { preSaveText } from "./Template_EHs/FLR_PreSaveEventHandler";
import { adminMessageText } from "./Template_EHs/General_AdminMessage_PreLoadEventHandler";

let curDir = "";
let projectName = "";

if (!vscode.workspace.workspaceFolders) {
    vscode.window.showInformationMessage("Open a folder to automatically set the project path");
} else {
    curDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
    projectName = curDir.split("\\").slice(-1)[0];
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new MainViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MainViewProvider.viewType, provider));
}


class MainViewProvider implements vscode.WebviewViewProvider {
    
    
    public static readonly viewType = "setup.setupView";

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case "runScript":
                        const scriptPath = `${message.projectpath}\\Event_Handler_Setup.ps1`;
                        fs.writeFileSync(scriptPath, scriptText);
                        child_process.spawnSync("powershell.exe",
                        ["-ExecutionPolicy", "Bypass",
                        "-file", scriptPath,
                        message.projectpath, message.projectname]);
                        fs.unlinkSync(scriptPath);
                        vscode.window.showInformationMessage(`Project ${message.projectname} successfully configured in ${message.projectpath}.`);
                        return;
                    case "generateFile":
                        switch (message.fileName) {
                          case "preLoad":
                            fs.writeFileSync(`${curDir}\\FLR_PreLoadEventHandler.cs`, preLoadText);
                            break;
                          case "preSave":
                            fs.writeFileSync(`${curDir}\\FLR_PreSaveEventHandler.cs`, preSaveText);
                            break;
                          case "adminMessage":
                            fs.writeFileSync(`${curDir}\\General_AdminMessage_PreLoadEventHandler.cs`, adminMessageText);
                            break;
                        }
                        vscode.window.showInformationMessage(`Template file successfully created in ${curDir}`);
                        return;
                }
            }
        );
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="ie=edge">
            <style>
              input[type=text] {
                width: 100%;
                margin: 8px 0;
                box-sizing: border-box;
                font-size: 12px;
              }
        
              h2,
              p {
                padding: 0;
                margin: 0;
              }
        
              #runScript, #compile {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
              }
            </style>
          </head>
        
          <body>
            <h2>Project directory</h2>
            <p style="font-size: 12px">This is the full path of where the template will be configured.</p>
            <input type="text" id="dirInput" value="${curDir}" required>
            <p style="margin: 15px"></p>
            
            <h2>Project name</h2>
            <input type="text" id="projInput" value="${projectName}" required>
            <p style="margin: 15px"></p>

            <button id="runScript">Setup project</button>
            <p style="margin: 100px"></p>

            <h2>Template Event Handlers</h2>
            <p style="font-size: 12px">Creates a specific SFTS template event handler in the current directory.</p>
            <h3 style="display: inline-block">Pre-Load</h3> <button onclick="generateFile('preLoad')">Create</button>
            <br />
            <h3 style="display: inline-block">Pre-Save</h3> <button onclick="generateFile('preSave')">Create</button>
            <br />
            <h3 style="display: inline-block">Admin Message</h3> <button onclick="generateFile('adminMessage')">Create</button>
            <p style="margin: 100px"></p>

            <h2>Compile Event Handler</h2>
            <p style="font-size: 12px">Builds the .dll file - to be imported into Relativity.</p>
            <button id="compile">Compile</button>

            <script>
              const vscode = acquireVsCodeApi();
              const runBtn = document.getElementById("runScript");
        
              function execScript() {
                const projectpath = document.getElementById("dirInput").value;
                const projectname = document.getElementById("projInput").value;
        
                vscode.postMessage({
                  command: "runScript",
                  projectpath: projectpath,
                  projectname: projectname
                })
              }

              function generateFile(fileType) {
                vscode.postMessage({
                    command: "generateFile",
                    fileName: fileType
                })
              }
        
              runBtn.addEventListener("click", execScript);
            </script>
          </body>
        
        </html>`;
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
