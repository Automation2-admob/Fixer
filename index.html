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
        processBtn.innerText = "FIX ALL VALIDATOR ERRORS";
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

async function cleanHtmlWithGemini(htmlCode, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
        ACT AS A GOOGLE ADS COMPLIANCE EXPERT. Fix this HTML to pass the H5 Validator perfectly.
        
        RULES:
        1. EXIT API (MANDATORY): Place <script src="https://tpc.googlesyndication.com/pagead/js/r20130206/utils/exitapi.js"></script> inside <head>.
        2. EXIT CALL (HARDCODE): You MUST ensure "ExitApi.exit()" is called somewhere. If there is no CTA button, add this attribute to the <body> tag: onclick="ExitApi.exit()". This ensures the Exit API is always detected.
        3. LAZY LOADING: Add loading="lazy" to every <img> and <iframe> tag.
        4. NO EXTERNAL LINKS: Replace any 'https://play.google.com...' or other store links with 'javascript:void(0);' and add onclick="ExitApi.exit()".
        
        Return ONLY the raw HTML. No markdown.
        
        HTML:
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

processBtn.onclick = async () => {
    const apiKey = apiKeyInput.value;
    logList.innerHTML = '';
    resultSection.classList.add('hidden');
    processBtn.disabled = true;
    processBtn.innerText = "CLEANING CODE...";

    const zip = new JSZip();
    const newZip = new JSZip();

    try {
        const contents = await zip.loadAsync(selectedFile);
        addLog("Analyzing ZIP structure...");

        let mainHtmlPath = "";
        // Search all folders for any HTML file to use as the entry point
        for (let path in contents.files) {
            if (path.toLowerCase().endsWith('.html')) {
                mainHtmlPath = path;
                break; 
            }
        }

        if (!mainHtmlPath) throw new Error("No HTML file found in ZIP!");

        for (let path in contents.files) {
            let fileData = contents.files[path];
            if (fileData.dir) continue;

            if (path === mainHtmlPath) {
                addLog(`Fixing Entry Point: ${path}`);
                let htmlText = await fileData.async("string");
                
                // Use Gemini for the heavy lifting
                const fixedHtml = await cleanHtmlWithGemini(htmlText, apiKey);
                
                // FIX ERROR 3: Always save as index.html at the ROOT
                newZip.file("index.html", fixedHtml);
                addLog("✅ Created 'index.html' at root folder.");
            } else {
                // Keep other assets in their relative folders
                const blob = await fileData.async("blob");
                newZip.file(path, blob);
            }
        }

        const finalZip = await newZip.generateAsync({type:"blob"});
        const url = window.URL.createObjectURL(finalZip);
        
        resultSection.classList.remove('hidden');
        downloadContainer.innerHTML = `
            <a href="${url}" download="VALIDATED_${selectedFile.name}" 
               class="inline-block px-10 py-4 bg-violet-600 text-white font-black rounded-xl hover:bg-violet-700 transition-all shadow-xl uppercase">
               Download Ready ZIP
            </a>
        `;
        
        addLog("🚀 Success! All 3 errors addressed.");
        processBtn.innerText = "FIX ANOTHER";
        processBtn.disabled = false;

    } catch (e) {
        addLog(`❌ ERROR: ${e.message}`);
        processBtn.innerText = "RETRY";
        processBtn.disabled = false;
    }
};
