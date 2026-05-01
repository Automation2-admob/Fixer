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

// Diagnostic Tool
document.getElementById('listModelsBtn').onclick = async () => {
    const apiKey = apiKeyInput.value;
    if (!apiKey) return alert("Enter API Key first");
    addLog("Fetching authorized models...");
    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
        const data = await resp.json();
        if (data.error) addLog(`❌ Error: ${data.error.message}`);
        else data.models.forEach(m => { 
            if (m.supportedGenerationMethods.includes('generateContent')) addLog(`• ${m.name}`); 
        });
    } catch (e) { addLog(`❌ Connection Error: ${e.message}`); }
};

// Handle File selection and drag/drop
dropZone.onclick = () => fileInput.click();

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

async function downloadAsset(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.blob();
    } catch (e) { return null; }
}

async function cleanHtmlWithGemini(htmlCode, apiKey) {
    // UPDATED to gemini-2.0-flash (most stable in your authorized list)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const prompt = `
        ACT AS A GOOGLE ADS COMPLIANCE EXPERT. Rewrite the HTML for H5 Validator:
        1. EXIT API: Injected <script src="https://tpc.googlesyndication.com/pagead/js/r20130206/utils/exitapi.js"></script> in <head>.
        2. MANDATORY EXIT CALL: Add onclick="ExitApi.exit()" to <body>.
        3. LAZY LOADING: Add loading="lazy" to all <img> and <iframe>.
        4. STRIP LINKS: Replace all 'https://' URLs (except Google Fonts/jQuery) with "".
        RETURN ONLY RAW HTML. NO MARKDOWN.
        
        HTML: ${htmlCode}
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
    if (!apiKey) return alert("Please enter your API Key!");
    
    logList.innerHTML = '';
    resultSection.classList.add('hidden');
    processBtn.innerText = "PROCESSING...";
    processBtn.disabled = true;

    const zip = new JSZip();
    const newZip = new JSZip();

    try {
        const contents = await zip.loadAsync(selectedFile);
        let mainHtmlPath = "";
        
        for (let path in contents.files) {
            if (path.toLowerCase().endsWith('.html') && !mainHtmlPath) { 
                mainHtmlPath = path; 
                break; 
            }
        }

        if (!mainHtmlPath) throw new Error("No HTML file found in ZIP!");

        let htmlText = await contents.files[mainHtmlPath].async("string");
        const mediaRegex = /https?:\/\/[^"']+\.(png|jpg|jpeg|gif|mp4|mp3|wav|ogg)/gi;
        const foundUrls = htmlText.match(mediaRegex) || [];
        
        for (const url of [...new Set(foundUrls)]) {
            const fileName = url.split('/').pop().split('?')[0];
            addLog(`Localizing: ${fileName}`);
            const assetBlob = await downloadAsset(url);
            if (assetBlob) {
                newZip.file(`assets/${fileName}`, assetBlob);
                htmlText = htmlText.split(url).join(`assets/${fileName}`);
            } else {
                htmlText = htmlText.split(url).join(""); 
            }
        }

        for (let path in contents.files) {
            let fileData = contents.files[path];
            if (!fileData.dir && path !== mainHtmlPath) {
                newZip.file(path, await fileData.async("blob"));
            }
        }

        addLog("AI Reviewing Policy with Gemini 2.0 Flash...");
        const fixedHtml = await cleanHtmlWithGemini(htmlText, apiKey);
        
        // Final bundle: Always index.html at root
        newZip.file("index.html", fixedHtml);

        const finalZip = await newZip.generateAsync({type:"blob"});
        const downloadUrl = window.URL.createObjectURL(finalZip);
        
        resultSection.classList.remove('hidden');
        downloadContainer.innerHTML = `<a href="${downloadUrl}" download="VALIDATED_${selectedFile.name}" class="inline-block px-12 py-5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-xl uppercase text-sm transition-all">Download ZIP</a>`;
        addLog("🚀 COMPLETED. Ready for Validator.");
    } catch (e) {
        addLog(`❌ FAILED: ${e.message}`);
    } finally {
        processBtn.innerText = "FIX ANOTHER";
        processBtn.disabled = false;
    }
};
