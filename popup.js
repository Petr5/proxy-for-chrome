console.log("This is a popup!");
document.addEventListener('DOMContentLoaded', function () {
    // document.getElementById('saveButton').addEventListener('click', saveInput);
    // document.getElementById('insertButton').addEventListener('click', insertContent);
    document.getElementById('applyProxy').addEventListener('click', applyProxy);
    document.getElementById('removeProxy').addEventListener('click', removeProxy);


  });

function saveInput() {
    var userInput = document.getElementById('inputField').value;
    console.log("userInput is", userInput);
    chrome.storage.sync.set({ 'userInput': userInput }, function() {
        console.log('User input saved:', userInput);
        alert(userInput);
        // Optionally, you can add feedback for the user here
    });
}

function insertContent() {
    console.log("insertContent called");
    var content = "This is inserted content!"; // Content to be inserted
    var paragraph = document.createElement("p"); // Create a new <p> element
    paragraph.textContent = content; // Set the text content of the paragraph
    document.body.appendChild(paragraph); // Append the paragraph to the body
}

function applyProxy() {
    var ip = document.getElementById('ipInput').value;
    var port = document.getElementById('portInput').value;
    
    // Define the proxy settings
    var config = {
        mode: 'fixed_servers',
        rules: {
            singleProxy: {
                scheme: 'http',
                host: ip,
                port: parseInt(port)
            }
        }
    };
    
    // Apply the proxy settings
    chrome.proxy.settings.set({ value: config, scope: 'regular' }, function() {
        console.log('Proxy applied:', config);
    });
}
function removeProxy() {
    // Reset proxy settings to default (direct connection)
    chrome.proxy.settings.clear({ scope: 'regular' }, function() {
        console.log('Proxy removed');
    });
}
