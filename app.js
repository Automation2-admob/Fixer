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

// --- DIAGNOSTIC: Check Models ---
document.getElementById('listModelsBtn').onclick = async () => {
    const apiKey = apiKeyInput.value;
    if (!apiKey) return alert("Enter API Key first");
    addLog("Fetching authorized models...");
    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await resp.json();
        if (data.error) addLog(`❌ Error: ${data.error.message}`);
        else data.models.forEach(m => { if (m.supportedGenerationMethods.includes('generateContent')) addLog(`• ${m.name}`); });
    } catch (e) { addLog(`❌ Connection Error: ${e.message}`); }
};

fileInput.onchange = (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        fileNameDisplay.innerText = selectedFile.name.toUpperCase();
        processBtn.disabled = false;
        processBtn.className = "w-full mt-8 py-5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all shadow-xl cursor-pointer uppercase tracking-widest text-sm";
    }
};

function addLog(msg) {
    logArea.classList.remove('hidden');
    const entry = document.createElement('div');
    entry.innerHTML = `> ${msg}`;
    logList.appendChild(entry);
    logList.scrollTop = logList.scrollHeight;
}

async function cleanHtmlWithGemini(htmlCode, apiKey) {
    // Standard V1 URL for Flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
        ACT AS A GOOGLE ADS COMPLIANCE EXPERT. Rewrite the HTML for H5 Validator:
        1. EXIT API: Place <script src="https://tpc.googlesyndication.com/pagead/js/r20130206/utils/exitapi.js"></script> in <head>.
        2. MANDATORY EXIT CALL: Add onclick="ExitApi.exit()" to <body>.
        3. LAZY LOADING: Add loading="lazy" to all <img> and <iframe>.
        4. STRIP LINKS: Replace all 'https://' URLs with "".
        RETURN ONLY RAW HTML.
        
        HTML: ${htmlCode}
    `;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text.replace(/```html|```/g, '').trim();
}

processBtn.onclick = async () => {
    const apiKey = apiKeyInput.value;
    logList.innerHTML = '';
    resultSection.classList.add('hidden');
    processBtn.innerText = "PROCESSING...";

    const zip = new JSZip();
    const newZip = new JSZip();

    try {
        const contents = await zip.loadAsync(selectedFile);
        let mainHtmlPath = "";
        for (let path in contents.files) {
            if (path.toLowerCase().endsWith('.html')) { mainHtmlPath = path; break; }
        }

        // Keep existing assets
        for (let path in contents.files) {
            let fileData = contents.files[path];
            if (!fileData.dir && path !== mainHtmlPath) {
                newZip.file(path, await fileData.async("blob"));
            }
        }

        // Fix HTML & Ensure index.html at root
        let htmlText = await contents.files[mainHtmlPath].async("string");
        addLog("AI Reviewing Policy...");
        const fixedHtml = await cleanHtmlWithGemini(htmlText, apiKey);
        
        newZip.file("index.html", fixedHtml);
        addLog("✅ Generated root index.html");

        const finalZip = await newZip.generateAsync({type:"blob"});
        const downloadUrl = window.URL.createObjectURL(finalZip);
        
        resultSection.classList.remove('hidden');
        downloadContainer.innerHTML = `<a href="${downloadUrl}" download="FIXED_${selectedFile.name}" class="inline-block px-12 py-5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-xl uppercase text-sm">Download ZIP</a>`;
        addLog("🚀 COMPLETED.");
    } catch (e) {
        addLog(`❌ FAILED: ${e.message}`);
    } finally {
        processBtn.innerText = "FIX ANOTHER";
    }
};

dropZone.onclick = () => fileInput.click();
