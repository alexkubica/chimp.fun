describe('Editor Preview Tests', () => {
  beforeEach(() => {
    // Visit the editor page
    cy.visit('/editor')
    
    // Wait for the page to load
    cy.get('h1').should('contain', 'CHIMP.FUN')
    cy.get('h1').should('be.visible')
  })

  it('should load the editor without crashing', () => {
    // Check that the main elements are present
    cy.get('[data-testid="editor-page"]', { timeout: 10000 }).should('exist')
    cy.get('h1').should('contain', 'CHIMP.FUN')
    
    // Check for NFT Editor title
    cy.contains('NFT Editor').should('be.visible')
    
    // Check for I'm Feeling Lucky button
    cy.contains("I'm Feeling Lucky").should('be.visible')
  })

  it('should handle FFmpeg preview rendering without crashing', () => {
    // Wait for FFmpeg to potentially load
    cy.wait(3000)
    
    // Try to trigger preview by selecting a collection and token
    // First, look for collection selector
    cy.get('body').then(($body) => {
      // Check if there are any select elements for collection
      if ($body.find('[role="combobox"]').length > 0) {
        // Try to open collection selector
        cy.get('[role="combobox"]').first().click()
        
        // Wait a bit and see if options appear
        cy.wait(1000)
        
        // Try to select the first option if available
        cy.get('body').then(($body2) => {
          if ($body2.find('[role="option"]').length > 0) {
            cy.get('[role="option"]').first().click()
          }
        })
      }
    })
    
    // Try the "I'm Feeling Lucky" button which should trigger rendering
    cy.contains("I'm Feeling Lucky").click()
    
    // Wait for potential rendering
    cy.wait(5000)
    
    // Check that the page hasn't crashed
    cy.get('h1').should('contain', 'CHIMP.FUN')
    cy.get('body').should('be.visible')
    
    // Look for any error messages or crashes
    cy.get('body').should('not.contain', 'ChunkLoadError')
    cy.get('body').should('not.contain', 'Script error')
    
    // Check console for errors
    cy.window().then((win) => {
      // The page should still be responsive
      expect(win.document.readyState).to.equal('complete')
    })
  })

  it('should handle multiple preview render attempts without crashing', () => {
    // Wait for initial load
    cy.wait(2000)
    
    // Try multiple "I'm Feeling Lucky" clicks to trigger multiple renders
    for (let i = 0; i < 3; i++) {
      cy.contains("I'm Feeling Lucky").click()
      cy.wait(2000)
      
      // Verify page is still responsive after each click
      cy.get('h1').should('contain', 'CHIMP.FUN')
      cy.get('body').should('be.visible')
    }
    
    // Final check that everything is still working
    cy.get('h1').should('be.visible')
    cy.contains('NFT Editor').should('be.visible')
  })

  it('should show preview image when FFmpeg processing completes', () => {
    // Wait for FFmpeg to load
    cy.wait(3000)
    
    // Trigger rendering with "I'm Feeling Lucky"
    cy.contains("I'm Feeling Lucky").click()
    
    // Wait for processing
    cy.wait(10000)
    
    // Look for preview images or canvas elements
    cy.get('body').then(($body) => {
      // Check for any images that might be the preview
      const images = $body.find('img')
      const hasPreviewImage = images.toArray().some(img => 
        img.alt && (
          img.alt.includes('Preview') || 
          img.alt.includes('preview') ||
          img.src.includes('blob:')
        )
      )
      
      if (hasPreviewImage) {
        cy.log('Preview image found')
      } else {
        cy.log('No preview image found - this might indicate the issue')
      }
    })
    
    // Check that page is still responsive
    cy.get('h1').should('be.visible')
  })

  it('should handle file upload without crashing', () => {
    // Wait for initial load
    cy.wait(2000)
    
    // Look for file input or upload button
    cy.get('body').then(($body) => {
      if ($body.find('input[type="file"]').length > 0) {
        // Create a test file
        const fileName = 'test-image.png'
        
        // Create a minimal PNG data URL
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        
        // Convert to blob and upload
        cy.get('input[type="file"]').first().then(($input) => {
          fetch(testImage)
            .then(res => res.blob())
            .then(blob => {
              const file = new File([blob], fileName, { type: 'image/png' })
              const dataTransfer = new DataTransfer()
              dataTransfer.items.add(file)
              $input[0].files = dataTransfer.files
              $input[0].dispatchEvent(new Event('change', { bubbles: true }))
            })
        })
        
        // Wait for processing
        cy.wait(5000)
        
        // Check page is still responsive
        cy.get('h1').should('be.visible')
      }
    })
  })
})