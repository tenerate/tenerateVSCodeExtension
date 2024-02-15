////////////////////
// IMPORTS
////////////////////
import * as vscode from 'vscode';
import * as crypto from 'crypto';
const axios = require('axios');

////////////////////
// CONSTANTS
////////////////////
// Backend API Url
const SERVER_URL: string = 'https://tenerate-flask-endpoint.vercel.app/generate_tests';
// Time out for requests
const REQUEST_TIMEOUT: number = 300000;

////////////////////
// REQUEST UTILITIES
////////////////////

/**
* Sends post request to SERVER_URL with documentUriHashId as id and dataString with request data
* @param {string} documentUriHashId
* @param {string} dataString
* @returns {Promise} 
*/
async function postRequest(documentUriHashId: string, dataString: string) {
	const https = require('node:https');

	return new Promise((resolve, reject) => {
	   const options = {
			method: "POST",
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': dataString.length,
			},
			timeout: REQUEST_TIMEOUT, // in ms
	   };
	   const req = https.request(SERVER_URL, options, (res) => {
		 if (res.statusCode < 200 || res.statusCode >= 300) {
			   return reject(new Error('statusCode=' + res.statusCode));
		   }

		   var body = [];
		   res.on('data', function(chunk) {
			   body.push(chunk);
		   });

		   res.on('end', function() {
			   try {
				   body = JSON.parse(Buffer.concat(body).toString());
			   } catch(e) {
				   reject(e);
			   }
			   resolve(body);
		   });
	   });

	   req.on('error', (e) => {
		 reject(e.message);
	   });
	   // send the request
	   req.write(dataString);
	   req.end();
   });
}

/**
* Sends get request to SERVER_URL to retrieve tests generated for documentUriHashId
* @param {string} documentUriHashId
* @returns {Promise} 
*/
async function getRequest(documentUriHashId: string) {
	const https = require('node:https');

	return new Promise((resolve, reject) => {
	   const options = {
			method: "GET",
			timeout: REQUEST_TIMEOUT, // in ms
	   };
	   const req = https.request(`${SERVER_URL}/${documentUriHashId}`, options, (res) => {
		 if (res.statusCode < 200 || res.statusCode >= 300) {
			   return reject(new Error('statusCode=' + res.statusCode));
		   }

		   var body = [];
		   res.on('data', function(chunk) {
			   body.push(chunk);
		   });

		   res.on('end', function() {
			   try {
				   body = JSON.parse(Buffer.concat(body).toString());
			   } catch(e) {
				   reject(e);
			   }
			   resolve(body);
		   });
	   });

	   req.on('error', (e) => {
		 reject(e.message);
	   });
	   
	   // send the request
	   req.end();
   });
}

////////////////////
// VSCODE UTILITIES
////////////////////
/**
* Returns active text editor
* @returns {vscode.TextEditor} 
*/
function getActiveTextEditor() {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) {
		vscode.window.showInformationMessage('No active text editor');
	}
	return activeTextEditor;
}

/**
* Appends text to end of document in a pretty way
* @param {string} text 
* @param {vscode.TextDocument} document
*/
async function prettyAddTextAsNewLine(text: string, document: vscode.TextDocument) {
	await addTextAsNewLine('\n', document);
	await addTextAsNewLine('\n', document);
	await fixTrailingSpaces(document);
	await addTextAsNewLine(text, document);
}

/**
* Appends text to end of document
* @param {string} text 
* @param {vscode.TextDocument} document
*/
async function addTextAsNewLine(text: string, document: vscode.TextDocument): Promise<boolean> {
	let lastLine = document.lineCount-1;
	let lastChar = document.lineAt(lastLine).text.length;

	let workspaceEdit = new vscode.WorkspaceEdit();
	workspaceEdit.insert(document.uri, new vscode.Position(lastLine, lastChar), text);

	return vscode.workspace.applyEdit(workspaceEdit);
}

/**
* Fixes trailing spaces at the end of document
* @param {vscode.TextDocument} document
*/
async function fixTrailingSpaces(document: vscode.TextDocument): Promise<boolean> {
	const lastLine = document.lineCount-1;
	let lastChar = document.lineAt(lastLine).text.length;
	let line = document.lineAt(lastLine);
	let trimmedLine = line.text.trim();
	let charRange = new vscode.Range(new vscode.Position(lastLine, 0), new vscode.Position(lastLine, lastChar));

	let workspaceEdit = new vscode.WorkspaceEdit();
	workspaceEdit.replace(document.uri, charRange, trimmedLine);

	return vscode.workspace.applyEdit(workspaceEdit);
}

/**
* Generates tests and appends them at the end of the document
* @param {PythonLanguageTextEditor} textEditor
* @param {vscode.TextDocument} activeDocument
*/
async function generateAndAddTests(textEditor, activeDocument, line) {
    console.log('Starting generate tests...');

    console.log('Starting document text and function name retrieval...');
    const documentText = activeDocument.getText();
    // const functionName = textEditor.getFunctionName(line.text);
    const dataString = JSON.stringify({ code: documentText, code_line: line.text });

    console.log('Starting post request..');
    try {
		vscode.window.showInformationMessage("Test generation started! Please wait 15-30 seconds for the tests to appear at the end of the document.");
        const postResponse = await axios.post(SERVER_URL, dataString, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const postResponseJson = postResponse.data;

        if (!postResponseJson || postResponseJson['status'] !== 'success') {
            vscode.window.showInformationMessage("Test generation failed! Please try again another time.");
            return;
        }

        textEditor.addResponseDataToFile(postResponseJson, activeDocument);
        vscode.window.showInformationMessage("Test generation is now complete!");
    } catch (error) {
        console.error('Error during test generation:', error);
		vscode.window.showInformationMessage("Test generation failed! Please try again another time.");
    }
};

//////////////////////////
// LANGUAGE EDITOR CLASSES
//////////////////////////

/////////////////////////////
// LANGUAGE EDITOR BASE CLASS
/////////////////////////////
class LanguageTextEditor {
    public fileExtension: string;
    public functionName: string;
    public commentCharacter: string;
    public assertStatements: Array<string>;

    constructor(fileExtension: string, functionName: string, commentCharacter: string, assertStatements: Array<string>) {
        this.fileExtension = fileExtension;
        this.functionName = functionName;
        this.commentCharacter = commentCharacter;
        this.assertStatements = assertStatements;
      }

    public isLineFunction(codeLine: string): boolean {
        return codeLine.includes(this.functionName);
    }

    public doesLineAssert(codeLine: string): boolean {
        for (const assertStatement of this.assertStatements){
            if (codeLine.includes(assertStatement)){
                return true;
            }
        }
        return false;
    }

    public isFileOfThisLanguage(fileName: string){
        return fileName.endsWith(this.fileExtension);
    }
}

///////////////////////////////
// LANGUAGE EDITOR PYTHON CLASS
///////////////////////////////
class PythonLanguageTextEditor extends LanguageTextEditor{
    constructor() {
        super("py", "def", '#', ["assert", "np.assert"]);
      };

    public getFunctionName(codeLine: string): string{
        const functionNameStart = codeLine.indexOf(this.functionName) + this.functionName.length + 1;
        const functionNameEnd = codeLine.indexOf("(");
        return codeLine.substring(functionNameStart, functionNameEnd);
    }

    public async addResponseDataToFile(responseData: any, activeDocument: vscode.TextDocument) {
        if (!responseData.message) {
            await prettyAddTextAsNewLine(this.getErrorMessageText(), activeDocument);
        }
    
        await prettyAddTextAsNewLine(responseData.message, activeDocument);
    }

    private getErrorMessageText(): string{
        return "# An error occured please try again later. The server is probably down for maintenance.";
    }
}

//////////////////////////////////////////////////
// EXTENSION ACTIVATION AND DEACTIVATION FUNCTIONS
//////////////////////////////////////////////////
export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('Tenerate.generateTests', async () => {
	// Get text editor and text document information	
		const activeTextEditor = getActiveTextEditor();
		
		if (activeTextEditor) {
			const cursorPosition = activeTextEditor.selection.active;
			let activeDocument = activeTextEditor.document;
			const line: vscode.TextLine = activeDocument.lineAt(cursorPosition);
			const fileSuffix: string = activeDocument.fileName.split(".").at(-1) || "";

			let pythonTextEditor = new PythonLanguageTextEditor();
			try {
				// Invoke endpoint for test generation if line has function 
				generateAndAddTests(pythonTextEditor, activeDocument, line);
			} catch(e) {
				let commentCharacter = "#";
	
				await prettyAddTextAsNewLine(`${commentCharacter} An error occured with test generation. Please try again later.`, activeDocument);
			}
		}
		
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}