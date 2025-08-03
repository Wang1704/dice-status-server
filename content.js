window.addEventListener("load", function () {
    initializeExtension();
});

// Add visibility change listener to reinitialize when tab becomes visible
document.addEventListener("visibilitychange", function() {
    if (!document.hidden) {
        // Small delay to ensure page is fully loaded
        setTimeout(() => {
            initializeExtension();
        }, 100);
    }
});

// Global flag to prevent duplicate initialization
let isInitialized = false;

function initializeExtension() {
    // Prevent duplicate initialization
    if (isInitialized) {
        return;
    }
    isInitialized = true;
    
    // Remove ads, info cards, blog posts, empty padded card container, and separator-xs divs
    // DISABLED: Ad removal functionality temporarily disabled
    /*
    const selectorsToRemove = [
      '.ads', 
      '.ad-banner', 
      'iframe[src*="ads"]', 
      '.advertisement', 
      '.ad-container', 
      '#bottom-ad',               // removes <ins id="bottom-ad">
      'ins.adsbygoogle',          // removes all <ins class="adsbygoogle"> ad blocks
      '.card.full.block.padded.more-rounded.filled',  // removes info div about virtual dice
      'h4.section-title',         // removes <h4 class="section-title">Blog Posts</h4>
      '.blog-post.more-rounded',  // removes all blog post blocks
      '.card.full.block.padded',  // removes the div with lots of separator-sm divs
      '.separator-xs'             // removes all <div class="separator-xs"></div>
    ];
    selectorsToRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
    });
    */

    // Inject CSS to tighten spacing (optional)
    const style = document.createElement('style');
    style.textContent = `
      /* Reduce space between dice and Roll Again button */
      .tabletop,
      #roll-again,
      .dice-wrapper {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }

      /* If there's any container adding extra margin */
      .roll-container {
        margin-bottom: 5px !important;
      }
    `;
    document.head.appendChild(style);

    const subtitle = document.getElementById("sub-title2");
    if (subtitle) subtitle.textContent = "Roll Color Dice";

    const defaultColors = ["blue", "gold", "purple", "orange", "green", "red"];
    let colorList = [];

    // Create color remover display
    function createColorRemoverDisplay() {
        const display = document.createElement('div');
        display.id = 'color-remover-display';
        display.style.cssText = `
            position: fixed;
            top: 15px;
            right: 15px;
            background: rgba(0, 0, 100, 0.9);
            color: white;
            padding: 6px 10px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 9px;
            z-index: 10000;
            min-width: 120px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        `;
        
        display.innerHTML = `
            <div id="color-list-display"></div>
        `;
        
        document.body.appendChild(display);
        updateColorDisplay();
    }

    function updateColorDisplay() {
        const display = document.getElementById('color-list-display');
        if (!display) {
            // If display is missing, recreate it
            createColorRemoverDisplay();
            return;
        }
        
        // Create simple display
        let html = '<div style="font-size: 10px; font-weight: bold; margin-bottom: 4px;">DICE STATUS</div>';
        
        if (colorList.length === 0) {
            html += '<div style="font-size: 8px; opacity: 0.7;">removed: none</div>';
        } else {
            html += `<div style="font-size: 8px;">removed: ${colorList.join(', ')}</div>`;
        }
        
        display.innerHTML = html;
    }

    chrome.storage.local.get(["colorList"], result => {
        colorList = result.colorList || [];
        updateDiceColors();
        createColorRemoverDisplay();
        
        // Ensure display is properly initialized
        setTimeout(() => {
            updateColorDisplay();
        }, 200);
    });

    function saveColorList() {
        chrome.storage.local.set({ colorList });
        
        // Send update to server for iPhone display
        fetch('https://your-app-name.railway.app/api/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ removedColors: colorList })
        }).catch(error => {
            console.log('Server not available, but extension still works');
        });
    }

    function updateDiceColors() {
        const diceWrappers = document.querySelectorAll('.tabletop .dice-wrapper');
        const numDice = diceWrappers.length;
        const validColors = ["blue", "gold", "purple", "orange", "green", "red"];
        
        // Get colors that are being removed (in colorList)
        const colorsToRemove = colorList;
        
        // Filter out removed colors from valid colors
        const availableColors = validColors.filter(color => !colorsToRemove.includes(color));
        
        // If all colors are being removed, use all valid colors (fallback)
        const colorsToUse = availableColors.length > 0 ? availableColors : validColors;
        
        // Apply colors to dice
        diceWrappers.forEach((wrapper, index) => {
            const icon = wrapper.querySelector("i");
            if (!icon) return;
            
            // Pick a random color from available colors
            const randomColor = colorsToUse[Math.floor(Math.random() * colorsToUse.length)];
            icon.style.color = randomColor;
        });
        
        // Update display after each roll (but don't reset colorList)
        updateColorDisplay();
    }

    // Keybindings 1-6 to remove colors, 0 or Shift to reset
    function handleKeydown(event) {
        const key = event.key;
        const colorMap = {
            "1": "red",
            "2": "orange",
            "3": "gold",
            "4": "green",
            "5": "blue",
            "6": "purple"
        };

        // Ensure colorList is initialized
        if (typeof colorList === 'undefined') {
            colorList = [];
        }

        if (key === "0" || (key === "Shift" && event.shiftKey)) {
            colorList = [];
            saveColorList();
            updateColorDisplay();
            console.log("Color list reset to empty:", colorList);
        } else if (colorMap[key]) {
            const selectedColor = colorMap[key];
            const currentCount = colorList.filter(c => c === selectedColor).length;
            
            // Handle key repeat (holding the key)
            if (event.repeat) {
                // Remove all instances of this color
                colorList = colorList.filter(c => c !== selectedColor);
                saveColorList();
                updateColorDisplay();
                console.log(`Removed all ${selectedColor} (key held)`);
                return;
            }
            
            // If color is already being removed (in the list), remove it from removal list
            if (currentCount > 0) {
                colorList = colorList.filter(c => c !== selectedColor);
                saveColorList();
                updateColorDisplay();
                console.log(`Stopped removing ${selectedColor}, updated color list:`, colorList);
            }
            // If color is not being removed, add it to removal list (but only if less than 5 colors are being removed)
            else if (colorList.length < 5) {
                colorList.push(selectedColor);
                saveColorList();
                updateColorDisplay();
                console.log(`Started removing ${selectedColor}, updated color list:`, colorList);
            } else {
                console.log(`Cannot remove more than 5 colors. Current removed: ${colorList.join(', ')}`);
            }
        }
    }

    // Keybindings 1-6 to remove colors, 0 or Shift to reset
    window.addEventListener("keydown", function (event) {
        const key = event.key;
        const colorMap = {
            "1": "red",
            "2": "orange",
            "3": "gold",
            "4": "green",
            "5": "blue",
            "6": "purple"
        };

        // Ensure colorList is initialized
        if (typeof colorList === 'undefined') {
            colorList = [];
        }

        if (key === "0" || (key === "Shift" && event.shiftKey)) {
            colorList = [];
            saveColorList();
            updateColorDisplay();
            console.log("Color list reset to empty:", colorList);
        } else if (colorMap[key]) {
            const selectedColor = colorMap[key];
            const currentCount = colorList.filter(c => c === selectedColor).length;
            
            // Handle key repeat (holding the key)
            if (event.repeat) {
                // Remove all instances of this color
                colorList = colorList.filter(c => c !== selectedColor);
                saveColorList();
                updateColorDisplay();
                console.log(`Removed all ${selectedColor} (key held)`);
                return;
            }
            
            // If color is already being removed (in the list), remove it from removal list
            if (currentCount > 0) {
                colorList = colorList.filter(c => c !== selectedColor);
                saveColorList();
                updateColorDisplay();
                console.log(`Stopped removing ${selectedColor}, updated color list:`, colorList);
            }
            // If color is not being removed, add it to removal list (but only if less than 5 colors are being removed)
            else if (colorList.length < 5) {
                colorList.push(selectedColor);
                saveColorList();
                updateColorDisplay();
                console.log(`Started removing ${selectedColor}, updated color list:`, colorList);
            } else {
                console.log(`Cannot remove more than 5 colors. Current removed: ${colorList.join(', ')}`);
            }
        }
    });
}