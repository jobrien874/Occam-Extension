# Occam-Extension (JavaScript)

<img width="230" height="230" alt="cropped_circle_image (1)" src="https://github.com/user-attachments/assets/98bc85d2-20d4-44d2-968a-302726d275e7" />

> **Work in Progress** - Will make use of Occam Lite out of the box https://github.com/jobrien874/Occam-AI-Lite/

Ever wondered if that function you just wrote is getting a bit too complex? This VS Code extension helps you keep your JavaScript code clean by analyzing functions in real-time and giving you instant feedback on their complexity.

## See It in Action

https://github.com/user-attachments/assets/82a38245-f5f0-4174-86f9-bf8da95132d9


Watch how the extension analyzes JavaScript functions and provides complexity insights right in your editor.

## What Does It Do?

As you write JavaScript, the extension quietly analyzes your functions and gives you helpful visual cues about their complexity. Think of it as a friendly code reviewer who's always watching your back.

**You'll see:**

- **Visual indicators** right next to your functions showing their complexity level
- **Detailed metrics** when you hover over a function (lines of code, cyclomatic complexity, nesting depth, etc.)
- **Smart suggestions** on how to simplify things when code gets too complex
- **Status bar updates** showing you the overall complexity landscape of your current file

**Complexity levels explained:**

- ✓ **Simple** - Nice and clean, easy to test and maintain
- ⚠ **Moderate** - Getting a bit complex, might want to think about refactoring
- ⚠ **Complex** - Time to break this down into smaller pieces

## Getting Started

Right now, the extension requires a local API server to do the analysis (we're working on making this easier!). Here's how to set it up:

### 1. Install the dependencies

```bash
# On Windows
install.bat

# On Linux/Mac
chmod +x install.sh
./install.sh
```

### 2. Fire up the API server

Make sure Docker is running, then:

```bash
docker-compose up -d
```

### 3. Configure VS Code

Open your VS Code settings (Ctrl/Cmd + ,) and add:

```json
{
  "codeComplexity.apiEndpoint": "http://localhost:8000",
  "codeComplexity.apiKey": "your-secure-api-key",
  "codeComplexity.enableInlineDecorations": true,
  "codeComplexity.analysisDelay": 1000,
  "codeComplexity.showMetrics": true
}
```

## How to Use It

Once everything's set up, the extension works automatically. Just open a JavaScript file and start coding - you'll see complexity indicators appear next to your functions as you type.

**Want to analyze a specific function?** Just select it, right-click, and choose "Analyze Function Complexity."

**Need a break from the feedback?** Open the command palette (Ctrl/Cmd + Shift + P) and run "Code Complexity: Toggle Inline Analysis" to turn it off temporarily.

## Configuration Options

You can tweak these settings to match your workflow:

- `codeComplexity.apiEndpoint` - Where your API server lives (default: `http://localhost:8000`)
- `codeComplexity.apiKey` - Your authentication key
- `codeComplexity.enableInlineDecorations` - Show those inline complexity indicators (default: `true`)
- `codeComplexity.analysisDelay` - How long to wait before analyzing (in milliseconds, default: `1000`)
- `codeComplexity.showMetrics` - Show detailed metrics when hovering (default: `true`)

## Under the Hood

The extension talks to a local API server (running in Docker) that uses machine learning models to analyze your code. It's a simple setup:

```
VS Code Extension  →  Docker API Server (FastAPI)  →  ML Models (PyTorch)
```

This means your code never leaves your machine - everything runs locally.

## For Developers

Want to hack on this yourself? Here's how:

```bash
# Get set up
npm install

# Build the TypeScript
npm run compile

# Watch for changes while developing
npm run watch

# Run the tests
npm test

# Package it up
vsce package
```

To debug, just press F5 in VS Code and it'll launch a development host for you to test in.

## Running Into Issues?

**Extension not doing anything?**

- Make sure the Docker server is running: `docker-compose ps`
- Double-check your API key in VS Code settings
- Test the connection: `curl http://localhost:8000/health`

**No complexity indicators showing up?**

- Verify inline decorations are enabled in settings
- Make sure VS Code recognizes the file as JavaScript
- Check the Developer Console (Help > Toggle Developer Tools) for errors

**Can't connect to the API?**

- Is Docker actually running?
- Is something else using port 8000?
- Check the API endpoint URL in your settings

## Contributing

This is still a work in progress! Issues and suggestions are welcome.

## License

See LICENSE file for details.
