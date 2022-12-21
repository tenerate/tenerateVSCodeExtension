# Tenerate README

Tenerate is a Visual Studio Code Extension that allows developers to automatically generate tests for their software with a single click. Currently, the extension only supports python functions.

This extension utilizes OpenAI's Codex models to generate the tests.

## How to use

1. Open a python file and hover over a function to generate tests
3. Press Command + T (Mac) or Control + Alt + T (Windows)

Please see below video demonstration on how to use extension.

Demo Video Link: https://www.youtube.com/watch?v=4Rp4Mwm1jEQ

## FAQ

Question: Why does the extension only support python functions instead of functions for all languages?

Answer: To maintain high quality for the generated tests, we perform extensive experimentation with and prompt engineering for each language. We have started with Python functions and plan to expand to functions of more languages.

Question: Can I trust that the tests will be 100% correct?

Answer: No, the tests and assertion statements are generated by AI so it is important to review them. Before using the tests and assertion statements, please confirm that they are correct and that they test the functionality you want.

Question: Should I use generated tests in production or other high impact environments without verifying them and editing them?

Answer: No, since the tests are generated by AI, you need to review the generated tests, edit them, and verify that they are correct before using them in production or other high impact environments.

Question: Does my code leave my local machine?

Answer: Yes, the code of the file in which you are generating tests leaves your local machine. We NEVER store your code. Your code is immediately DELETED after it is used for generating tests.

Question: How can I submit a suggestion for improvement or report an issue for the extension?

Answer: Through the github repository issues: https://github.com/tenerate/tenerateVSCodeExtension/issues

## Requirements

The extension only supports test generation for python functions at the moment.

## Acknowledgements

By using this extension, you acknowledge that:
1. The contents of the file that you submit for test generation leave your local machine for test generation
2. Since the tests are generated by AI, you need to review the generated tests, edit them as needed, and verify that they are correct before using them in production or other high impact environments

We take no responsibility for issues occuring in production or other high impact environments due to errors in generated tests or costs from those issues. The generated tests are meant to be used as an outline for tests but not as finalized tests. The user of this extension is responsible for verifying the tests and updating tests that need changes.

## Support
For any questions or issues regarding using Tenerate, please reach out to: tenerate@outlook.com

## Known Issues

1. If we close the tab in which we are generating tests, the tests might be indented in an unexpected way. To avoid that, please do not close the tab in which you have started generating tests and do not edit the file name or file path.
2. Double check the assertion statement values to confirm that the generated tests make sense. Since this extension relies on AI to generate the tests, it is possible that the AI generates tests with incorrect assertion statement values.

If you find any other issues or have any feature suggestions, please share it in this link: https://forms.gle/xztL7twcqwdHKTQN7

## Release Notes

### 1.0.4

Added git repository and updated link for raising issues for extension to be git issues. Also, updated demo link.

### 1.0.3

Fixed bug that caused "Command not found" error and reactivated extension.

### 1.0.2

Added Tenerate support email to communicate questions or issues about Tenerate.

### 1.0.1

Public release of Tenerate