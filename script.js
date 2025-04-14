// API configuration
const API_KEY = "34c8103e63msh909728bfda25be5p1bb0fbjsnd587398101bf";

// Language to ID mapping (Judge0 API)
const language_to_id = {
    "C": 50,
    "C++": 54,
    "Java": 62,
    "Python": 71,
    "JavaScript": 63,
    "HTML": 68  // Using JavaScript (Node.js) for HTML/CSS/JS execution
};

// Initialize CodeMirror editor
const editor = CodeMirror.fromTextArea(document.getElementById('source'), {
    lineNumbers: true,
    mode: "htmlmixed",
    theme: "dracula",
    indentUnit: 4,
    tabSize: 4,
    lineWrapping: true,
    autoCloseTags: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    extraKeys: {
        "Ctrl-Enter": runCode,
        "Tab": function(cm) {
            cm.replaceSelection("    ", "end");
        }
    }
});

// Tab switching functionality
document.getElementById('output-tab').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('console-tab').classList.remove('active');
    document.getElementById('output-frame').style.display = 'block';
    document.getElementById('text-output').style.display = 'none';
});

document.getElementById('console-tab').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('output-tab').classList.remove('active');
    document.getElementById('output-frame').style.display = 'none';
    document.getElementById('text-output').style.display = 'block';
});

// Set editor mode based on language selection
document.getElementById('lang').addEventListener('change', function() {
    const lang = this.value;
    let mode;
    
    switch(lang) {
        case "Python":
            mode = "python";
            break;
        case "Java":
        case "C":
        case "C++":
            mode = "clike";
            break;
        case "JavaScript":
            mode = "javascript";
            break;
        case "HTML":
            mode = "htmlmixed";
            break;
        default:
            mode = "clike";
    }
    
    editor.setOption("mode", mode);
});

// Encode function for Judge0 API
function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

// Decode function for Judge0 API
function decode(bytes) {
    const escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

// Error handler for API calls
function errorHandler(jqXHR, textStatus, errorThrown) {
    document.getElementById('status').textContent = "Error";
    document.getElementById('text-output').value = `Error: ${JSON.stringify(jqXHR.responseJSON || jqXHR.statusText, null, 2)}`;
    document.getElementById('run').disabled = false;
    document.getElementById('run').innerHTML = '<i class="fas fa-play"></i> Run (Ctrl+Enter)';
    
    // Show console tab on error
    document.getElementById('console-tab').click();
}

// Check submission status
function checkSubmission(token) {
    document.getElementById('status').textContent = "Processing...";
    document.getElementById('text-output').value += "\nChecking submission status...";
    
    $.ajax({
        url: `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=true`,
        type: "GET",
        headers: {
            "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
            "x-rapidapi-key": API_KEY
        },
        success: function(data) {
            if ([1, 2].includes(data.status.id)) {
                setTimeout(() => checkSubmission(token), 1000);
            } else {
                let output = "";
                
                if (data.compile_output) {
                    output += decode(data.compile_output);
                }
                
                if (data.stdout) {
                    output += decode(data.stdout);
                }
                
                if (data.stderr) {
                    output += decode(data.stderr);
                }
                
                document.getElementById('text-output').value = output.trim();
                document.getElementById('run').disabled = false;
                document.getElementById('run').innerHTML = '<i class="fas fa-play"></i> Run (Ctrl+Enter)';
                document.getElementById('status').textContent = "Completed";
                
                // Special handling for HTML output
                if (document.getElementById('lang').value === "HTML") {
                    try {
                        const htmlOutput = decode(data.stdout);
                        if (htmlOutput) {
                            const frame = document.getElementById('output-frame');
                            frame.srcdoc = htmlOutput;
                            document.getElementById('output-tab').click();
                        }
                    } catch (e) {
                        console.error("Error displaying HTML output:", e);
                        document.getElementById('text-output').value += "\nError displaying HTML: " + e.message;
                        document.getElementById('console-tab').click();
                    }
                } else {
                    document.getElementById('console-tab').click();
                }
            }
        },
        error: errorHandler
    });
}

// Main run function
function runCode() {
    const runButton = document.getElementById('run');
    runButton.disabled = true;
    runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
    
    document.getElementById('status').textContent = "Submitting...";
    document.getElementById('text-output').value = "Creating submission...";
    document.getElementById('console-tab').click();
    
    const lang = document.getElementById('lang').value;
    const sourceCode = editor.getValue();
    
    // Special handling for HTML - we'll wrap it in a script for Node.js execution
    let codeToExecute = sourceCode;
    if (lang === "HTML") {
        codeToExecute = `
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(\`${sourceCode.replace(/`/g, '\\`')}\`);
        console.log(dom.serialize());
        `;
    }
    
    $.ajax({
        url: "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true",
        type: "POST",
        contentType: "application/json",
        headers: {
            "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
            "x-rapidapi-key": API_KEY
        },
        data: JSON.stringify({
            language_id: language_to_id[lang],
            source_code: encode(codeToExecute),
            stdin: encode(""),
            redirect_stderr_to_stdout: true
        }),
        success: function(data) {
            document.getElementById('text-output').value = "Submission created. Waiting for results...";
            setTimeout(() => checkSubmission(data.token), 2000);
        },
        error: errorHandler
    });
}

// Event listeners
document.getElementById('run').addEventListener('click', runCode);

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        runCode();
    }
});

// Initialize with HTML mode
editor.setOption("mode", "htmlmixed");

// Disable right click 
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
