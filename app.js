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
let zipCounter = 1; 

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

function preProcessHtml(html) {
    let clean = html
        .replace(/<img\s+/gi, '<img loading="lazy" ')
        .replace(/<iframe\s+/gi, '<iframe loading="lazy" ')
        .replace(/<video\s+/gi, '<video loading="lazy" ');
    const exitScript = '<script src="https://tpc.googlesyndication.com/pagead/js/r20130206/utils/exitapi.js"></script>';
    if (!clean.includes('exitapi.js')) {
        clean = clean.replace('<head>', `<head>\n${exitScript}`);
    }
    return clean;
}

async function cleanHtmlWithGemini(htmlCode, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `
        ACT AS A GOOGLE ADS COMPLIANCE EXPERT.
        STRICT RULES:
        1. Ensure <body> has onclick="ExitApi.exit()".
        2. Ensure every <img>, <video>, and <iframe> has loading="lazy".
        3. Remove ALL external http/https links and replace with "".
        4. Do NOT change the connection to internal .js files.
        RETURN ONLY RAW HTML. NO MARKDOWN.
        HTML TO REVIEW: ${htmlCode}
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
    if (!apiKey) return alert("Please enter your API Key!");
    logList.innerHTML = '';
    resultSection.classList.add('hidden');
    processBtn.innerText = "FORCING LAZY LAYOUT...";
    processBtn.disabled = true;
    const zip = new JSZip();
    const newZip = new JSZip();

    try {
        const contents = await zip.loadAsync(selectedFile);
        let mainHtmlPath = "";
        for (let path in contents.files) {
            if (path.toLowerCase().endsWith('.html') && !mainHtmlPath) { mainHtmlPath = path; break; }
        }
        if (!mainHtmlPath) throw new Error("No HTML file found!");

        let rawHtml = await contents.files[mainHtmlPath].async("string");
        let htmlText = preProcessHtml(rawHtml);
        addLog("Lazy layout and ExitAPI injected.");

        const mediaRegex = /https?:\/\/[^"']+\.(png|jpg|jpeg|gif|mp4|mp3|wav|ogg)/gi;
        const foundUrls = htmlText.match(mediaRegex) || [];
        for (const url of [...new Set(foundUrls)]) {
            const fileName = url.split('/').pop().split('?')[0];
            const assetBlob = await downloadAsset(url);
            if (assetBlob) {
                newZip.file(`assets/${fileName}`, assetBlob);
                htmlText = htmlText.split(url).join(`assets/${fileName}`);
                addLog(`✅ Localized: ${fileName}`);
            } else {
                htmlText = htmlText.split(url).join(""); 
                addLog(`⚠️ Link Stripped: ${fileName}`);
            }
        }

        for (let path in contents.files) {
            let fileData = contents.files[path];
            if (!fileData.dir && !path.toLowerCase().endsWith('.html')) {
                newZip.file(path, await fileData.async("blob"));
            }
        }

        addLog("Gemini performing final verification...");
        const finalHtml = await cleanHtmlWithGemini(htmlText, apiKey);
        newZip.file("index.html", finalHtml);

        const finalZip = await newZip.generateAsync({type:"blob"});
        const downloadUrl = window.URL.createObjectURL(finalZip);
        const zipName = `Validator_${zipCounter}.zip`;
        
        resultSection.classList.remove('hidden');
        downloadContainer.innerHTML = `
            <a href="${downloadUrl}" download="${zipName}" class="inline-block px-12 py-5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 shadow-xl uppercase text-sm transition-all text-center">
                Download ${zipName}
            </a>
        `;
        
        addLog(`🚀 COMPLETED: ${zipName} generated.`);
        zipCounter++; 
        
    } catch (e) {
        addLog(`❌ FAILED: ${e.message}`);
    } finally {
        processBtn.innerText = "FIX ANOTHER";
        processBtn.disabled = false;
    }
};
