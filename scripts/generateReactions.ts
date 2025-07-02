import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const reactions = [
  "Raid it.",
  "Where the heck\nIs blue?",
  "SIUUU",
  "WEN?",
  "!LFCHIMP",
  "Azuki",
  "BAYC",
  "studio Azuki",
  "Happy\nmutant monday!",
  "HMM",
  "!OOH",
  "anime",
  "do it."
];

async function generateReactions() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set download path
  const downloadPath = path.join(process.cwd(), 'public', 'reactions');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  
  // Configure download behavior
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });
  
  try {
    console.log('Navigating to pixelspeechbubble.com...');
    await page.goto('http://pixelspeechbubble.com', { waitUntil: 'networkidle2' });
    
    for (let i = 0; i < reactions.length; i++) {
      const text = reactions[i];
      console.log(`\nGenerating reaction ${i + 1}/${reactions.length}: "${text}"`);
      
      try {
        // Wait for the page to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Find and clear the text input (specifically the textarea with id="text")
        const textInput = await page.$('#text');
        if (textInput) {
          await textInput.click({ clickCount: 3 }); // Select all text
          await textInput.type(text);
          console.log(`Text entered: "${text}"`);
        } else {
          console.log('Text input #text not found, skipping this reaction');
          continue;
        }
        
        // Wait a moment for the input to register
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for create button (specifically the input with id="submit")
        const createButton = await page.$('#submit');
        
        if (createButton) {
          console.log('Clicking create button...');
          await createButton.click();
          
          // Wait for the image to be generated and download link to appear
          console.log('Waiting for bubble generation...');
          await page.waitForSelector('#downloadLink', { visible: true, timeout: 10000 });
          
          // Look for download button (specifically the link with id="downloadLink")
          const downloadButton = await page.$('#downloadLink');
          
          if (downloadButton) {
            console.log('Clicking download button...');
            await downloadButton.click();
            
            // Wait for download to complete
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log(`✅ Successfully generated and downloaded: "${text}"`);
          } else {
            console.log('❌ Download button #downloadLink not found');
          }
        } else {
          console.log('❌ Create button #submit not found, skipping this reaction');
          continue;
        }
        
        // Wait before processing next reaction
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error processing reaction "${text}":`, error);
        continue;
      }
    }
    
  } catch (error) {
    console.error('Error during automation:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ All reactions processing complete!');
  console.log(`Check the ${downloadPath} directory for downloaded files.`);
}

// Run the script
generateReactions().catch(console.error);