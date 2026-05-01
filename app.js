const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const logList = document.getElementById('logList');
const logArea = document.getElementById('logArea');
const resultSection = document.getElementById('resultSection');
const downloadContainer = document.getElementById('downloadContainer');
const apiKeyInput = document.getElementById('apiKeyInput');

let selectedFile = null;

// Handle File Selection
dropZone.onclick = () => fileInput.click();
fileInput.onchange = (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileNameDisplay.innerText = selectedFile.name;
        checkReady();
    }
};

apiKeyInput.oninput = () => checkReady();

function checkReady() {
    if (selectedFile && apiKeyInput.value.length > 10) {
        processBtn.disabled = false;
        processBtn.innerText = "START AI POLICY FIX";
        processBtn.className = "w-full mt-6 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg cursor-pointer uppercase tracking-widest";
    }
}

function addLog(msg) {
    logArea.classList.remove('hidden');
    const entry = document.createElement('div');
    entry.innerText = `> ${msg}`;
    logList.appendChild(entry);
    logList.scrollTop = logList.scrollHeight;
}

// AI Fixing Function
async function cleanHtmlWithGemini(htmlCode, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
        You are a Google Ads Compliance Expert. Fix the following HTML code to pass H5 Validator:
        1. Ensure <script src="https://tpc.googlesyndication.com/pagead/js/r20130206/utils/exitapi.js"></script> is the first tag in <head>.
        2. Identify CTA buttons (Install, Play Now, etc.) and add onclick="ExitApi.exit()". 
        3. CRITICAL: There must be at least one ExitApi.exit() call in the code. If no CTA is found, add onclick="ExitApi.exit()" to the main container or <body>.
        4. Add loading="lazy" to all <img> and <iframe> tags.
        5. Convert absolute URLs to relative paths (e.g. change https://site.com/img.png to img.png).
        
        Return ONLY the raw HTML code. Do not include markdown code blocks or explanations.
        
        HTML CODE:
        ${htmlCode}
    `;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    let cleaned = data.candidates[0].content.parts[0].text;
    return cleaned.replace(/```html|```/g, '').trim();
}

// Main Processing Loop
processBtn.onclick = async () => {
    const apiKey = apiKeyInput.value;
    logList.innerHTML = '';
    resultSection.classList.add('hidden');
    processBtn.disabled = true;
    processBtn.innerText = "AI IS REVIEWING...";

    const zip = new JSZip();
    const newZip = new JSZip();

    try {
        const contents = await zip.loadAsync(selectedFile);
        addLog("ZIP Loaded successfully.");

        let mainHtmlPath = "";
        // Find the primary HTML file
        for (let path in contents.files) {
            if (path.toLowerCase().endsWith('.html') && !mainHtmlPath) {
                mainHtmlPath = path;
            }
        }

        for (let path in contents.files) {
            let fileData = contents.files[path];
            if (fileData.dir) continue;

            if (path === mainHtmlPath) {
                addLog(`Found Entry Point: ${path}`);
                let htmlText = await fileData.async("string");
                
                addLog("Sending to Gemini AI for structural fixes...");
                const fixedHtml = await cleanHtmlWithGemini(htmlText, apiKey);
                
                // Force rename to index.html at root (Error 3 Fix)
                newZip.file("index.html", fixedHtml);
                addLog("✅ Created index.html at root with AI fixes.");
            } else {
                // Preserve folder structure for assets/js/css
                const blob = await fileData.async("blob");
                newZip.file(path, blob);
                addLog(`Preserving asset: ${path}`);
            }
        }

        const finalZip = await newZip.generateAsync({type:"blob"});
        const url = window.URL.createObjectURL(finalZip);
        
        resultSection.classList.remove('hidden');
        downloadContainer.innerHTML = `
            <a href="${url}" download="FIXED_${selectedFile.name}" 
               class="inline-block px-10 py-4 bg-violet-600 text-white font-black rounded-xl hover:bg-violet-700 transition-all shadow-xl uppercase">
               Download Fixed Bundle
            </a>
        `;
        
        addLog("🚀 All fixes complete! Ready for download.");
        processBtn.innerText = "PROCESS ANOTHER";
        processBtn.disabled = false;

    } catch (e) {
        addLog(`❌ ERROR: ${e.message}`);
        processBtn.innerText = "FIX FAILED - TRY AGAIN";
        processBtn.disabled = false;
    }
};
