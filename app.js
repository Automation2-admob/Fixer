const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const logList = document.getElementById('logList');
const resultSection = document.getElementById('resultSection');
const downloadContainer = document.getElementById('downloadContainer');

let selectedFile = null;

// File Selection Logic
dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    selectedFile = file;
    fileNameDisplay.innerText = file.name;
    processBtn.disabled = false;
    processBtn.innerText = "FIX & VALIDATE ZIP";
    processBtn.className = "w-full mt-6 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200";
}

// Processing Logic
processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    processBtn.innerText = "WORKING...";
    processBtn.disabled = true;
    logList.innerHTML = '';

    const zip = new JSZip();
    const newZip = new JSZip();

    try {
        const contents = await zip.loadAsync(selectedFile);
        
        for (let path in contents.files) {
            let currentFile = contents.files[path];
            
            if (path.endsWith('.html')) {
                let htmlText = await currentFile.async("string");

                // --- 1. ExitAPI Mandatory Injection ---
                if (!htmlText.includes('exitapi.js')) {
                    htmlText = htmlText.replace('<head>', 
                        '<head>\n<script src="https://tpc.googlesyndication.com/pagead/js/r20130206/utils/exitapi.js"></script>');
                    addLog(`Injected ExitAPI into: ${path}`);
                }

                // --- 2. Lazy Loading Injection ---
                htmlText = htmlText.replace(/<img (?!.*loading=)/g, '<img loading="lazy" ');
                htmlText = htmlText.replace(/<iframe (?!.*loading=)/g, '<iframe loading="lazy" ');
                addLog(`Applied Lazy Loading in: ${path}`);

                // --- 3. External Link to ExitApi.exit() ---
                const urlRegex = /href=["'](https?:\/\/[^"']+)["']/g;
                htmlText = htmlText.replace(urlRegex, 'onclick="ExitApi.exit()" style="cursor:pointer"');
                addLog(`Sanitized External Links in: ${path}`);

                newZip.file(path, htmlText);
            } else {
                // Preserve original structure for JS, CSS, assets, etc.
                const blob = await currentFile.async("blob");
                newZip.file(path, blob);
                addLog(`Preserved asset: ${path}`);
            }
        }

        // Finalize Zip
        const finalZip = await newZip.generateAsync({type:"blob"});
        const url = window.URL.createObjectURL(finalZip);
        
        // Show Results
        resultSection.classList.remove('hidden');
        downloadContainer.innerHTML = `
            <a href="${url}" download="FIXED_${selectedFile.name}" 
               class="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all">
               DOWNLOAD ZIP
            </a>
        `;
        
        processBtn.innerText = "PROCESS ANOTHER FILE";
        processBtn.disabled = false;

    } catch (err) {
        alert("Error processing ZIP: " + err.message);
        processBtn.innerText = "ERROR - TRY AGAIN";
        processBtn.disabled = false;
    }
});

function addLog(msg) {
    const li = document.createElement('li');
    li.innerHTML = `• ${msg}`;
    logList.appendChild(li);
}
