////////////////////////////////
// RPG Maker Backup Utility.
// Version: 1.1
////////////////////////////////
// Changelog:
// - Hooked into RPGMaker MV's internal methods for grabbing storage Keys
// - Implemented compression and decompression functions
// - Implemented compression setting flag.
// - Implemented local file check.
////////////////////////////////

// Settings.
let decompressionEnabled = true;

let saveInit = false;
let canImport = false;
let recoveryData = null;

const gamePrefix = 'RPG';


// Runs decompression on data if it's enabled.
function decompress(source) {
    if(decompressionEnabled) {
        return LZString.decompressFromBase64(source);
    }
    
    return(source);
}

// Runs compression on data if it's in JSON format.
function compress(source) {
    try {
        JSON.parse(source)
        return LZString.compressToBase64(source);
    } 
    catch (e) {
        return source;
    }
}

// Finds and retrieves all available save data, up to 100 save files.
function getSaveData() {
    let data = {
        global: null,
        config: null,
        saves: []
    };
    
    for (let i = -1; i < 100; i++) {
        let ID = StorageManager.webStorageKey(i);
    
        if(i === -1 && localStorage.getItem(ID) !== null) {
            data.config = {
                name: ID, 
                data: decompress(localStorage.getItem(ID))
            }
        }
        
        if(i === 0 && localStorage.getItem(ID) !== null) {
            data.global = {
                name: ID, 
                data: decompress(localStorage.getItem(ID))
            }
        }
        
        if(i > 0 && localStorage.getItem(ID) !== null) {
            data.saves.push({
                name: ID, 
                data: decompress(localStorage.getItem(ID))
            });
        }
    }
    
    data.saveCount = data.saves.length;
    
    return data;
}

function initSaveManager(){
	document.getElementById('fileInput').addEventListener('change', handleFileSelect, false);
	
	// Present error if running from a file.
	if(window.location.protocol !== "http:" && window.location.protocol !== "https:") {
	    Alert(`ERROR: This game appears to be running from a local file.
\nDue to the nature of RPG Maker MV games, you'll need to host this from a web server such as Apache or NGINX.
        
\n\nFor Ubuntu users, run this command: "sudo apt install apache2" to install a web server.

For Fedora users, run this command: "sudo dnf install httpd" instead to install web server.

Once a web server is installed, copy the contents of the directory containing this index.html file to "/var/www/html/", You will likely need to access this directory as root.

For windows users, I recommend trying XAMMP or an equivalent software. I have not tried this under Windows so I can't help any further.`);
	}
}

function handleFileSelect(event){
	const reader = new FileReader()
	reader.onload = handleFileLoad;
	reader.readAsText(event.target.files[0])
}

function handleFileLoad(event){
	recoveryData = JSON.parse(event.target.result);
	if(recoveryData.saveCount !== undefined) {
		document.getElementById('fileContent').textContent = "Save File Count: " + recoveryData.saveCount;
		canImport = true;
	} else {
		document.getElementById('fileContent').textContent = "Invalid backup file.";
	}
}


// Exports saves. Assumes a standard save file naming convention.
function ExportSaves(filename) {
	ExportData = {};

	ExportData.Global = JSON.parse(LZString.decompressFromBase64(localStorage.getItem(gamePrefix + ' Global')));

	let configRaw = LZString.decompressFromBase64(localStorage.getItem(gamePrefix + ' Config'));
	if (configRaw != "") ExportData.Config = JSON.parse(configRaw);

	let saveId = 1;
	let foundSaves = false;

	while(true) {
		currentSave = localStorage.getItem(gamePrefix + ' File' + saveId);
		
		if(currentSave !== null) {
			ExportData['File' + saveId] = JSON.parse(LZString.decompressFromBase64(currentSave));
			saveId ++;
		} else {
			break;
		}
	}
	
	ExportData.saveCount = saveId - 1;

	let element = document.createElement('a');

	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(ExportData)));

	element.setAttribute('download', filename);

    	element.style.display = 'none';
    	document.body.appendChild(element);

    	element.click();

    	document.body.removeChild(element);

	return JSON.stringify(ExportData);
}

function ImportSaves(json) {
	if (canImport == false) return false;
	
	data = (Array.isArray(json)) ? JSON.parse(json) : json; // Left over from testing.
	localStorage.setItem(gamePrefix + ' Global', LZString.compressToBase64(JSON.stringify(data.Global)));
	if (data.Config != "") localStorage.setItem(gamePrefix + ' Config', LZString.compressToBase64(JSON.stringify(data.Config)));

	for(i = 1; i <= data.saveCount; i++) {
		localStorage.setItem(gamePrefix + ' File' + i, LZString.compressToBase64(JSON.stringify(data['File' + i])));
	}
	
	location.reload();
	
	return true;
}

function toggleSaveManager() {
	if (!saveInit) initSaveManager();
	
	let el = document.getElementById('save-manager');
	
	el.style.zIndex = (el.style.zIndex == "100") ? 0 : 100; //This is done to make sure the recovery utility is usable, as RPG maker seems to interfere with extra divs.
}
