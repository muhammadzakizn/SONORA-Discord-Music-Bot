// Lyrics Translation UI Manager

class TranslationManager {
    constructor() {
        this.currentLyrics = null;
        this.translatedLyrics = null;
        this.currentLanguage = 'en';
        this.isVisible = false;
        this.languages = {
            'en': 'English',
            'id': 'Indonesian',
            'th': 'Thai',
            'ar': 'Arabic',
            'tr': 'Turkish'
        };
        
        this.init();
    }
    
    init() {
        // Load languages
        this.loadLanguages();
    }
    
    async loadLanguages() {
        try {
            const response = await fetch('/api/translate/languages');
            if (response.ok) {
                this.languages = await response.json();
            }
        } catch (error) {
            console.error('Failed to load languages:', error);
        }
    }
    
    showTranslationMenu(lyrics) {
        this.currentLyrics = lyrics;
        
        // Create modal
        const modal = this.createTranslationModal();
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    createTranslationModal() {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const modal = document.createElement('div');
        modal.className = 'glass-modal modal-enter';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            width: 90%;
            max-width: 500px;
        `;
        
        modal.innerHTML = `
            <div class="modal-header" style="margin-bottom: 1.5rem;">
                <h2 class="gradient-maroon-text" style="font-size: 1.5rem; font-weight: 700; margin: 0;">
                    🌐 Translate Lyrics
                </h2>
                <button id="close-translation-modal" class="glass-btn" style="position: absolute; top: 0; right: 0;">
                    ✕
                </button>
            </div>
            
            <div class="modal-body">
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                    Select language to translate lyrics
                </p>
                
                <div class="language-selector" style="margin-bottom: 1.5rem;">
                    <select id="translation-language" class="glass-input" style="width: 100%;">
                        ${Object.entries(this.languages).map(([code, name]) => 
                            `<option value="${code}">${name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="modal-actions" style="display: flex; gap: 1rem;">
                    <button id="translate-btn" class="btn-maroon" style="flex: 1;">
                        ✓ Translate
                    </button>
                    <button id="cancel-translation-btn" class="btn-maroon-outline" style="flex: 1;">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.appendChild(backdrop);
        container.appendChild(modal);
        
        // Event listeners
        backdrop.addEventListener('click', () => this.closeTranslationModal(container));
        modal.querySelector('#close-translation-modal').addEventListener('click', () => this.closeTranslationModal(container));
        modal.querySelector('#cancel-translation-btn').addEventListener('click', () => this.closeTranslationModal(container));
        modal.querySelector('#translate-btn').addEventListener('click', () => this.translateLyrics(container));
        
        // Show backdrop
        setTimeout(() => backdrop.style.opacity = '1', 10);
        
        return container;
    }
    
    closeTranslationModal(container) {
        const backdrop = container.querySelector('.modal-backdrop');
        const modal = container.querySelector('.glass-modal');
        
        backdrop.style.opacity = '0';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
        
        setTimeout(() => container.remove(), 300);
    }
    
    async translateLyrics(container) {
        const languageSelect = container.querySelector('#translation-language');
        const targetLang = languageSelect.value;
        const translateBtn = container.querySelector('#translate-btn');
        
        // Show loading
        translateBtn.disabled = true;
        translateBtn.innerHTML = '<span class="dots-loading"><span></span><span></span><span></span></span>';
        
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lyrics: this.currentLyrics,
                    target_lang: targetLang,
                    source_lang: 'auto'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.translatedLyrics = result.translated;
                this.currentLanguage = targetLang;
                
                // Close modal
                this.closeTranslationModal(container);
                
                // Show translated lyrics
                this.displayTranslatedLyrics(result);
            } else {
                throw new Error('Translation failed');
            }
        } catch (error) {
            console.error('Translation error:', error);
            alert('Translation failed. Please try again.');
            translateBtn.disabled = false;
            translateBtn.textContent = '✓ Translate';
        }
    }
    
    displayTranslatedLyrics(result) {
        const lyricsContainer = document.getElementById('lyrics-display');
        if (!lyricsContainer) return;
        
        // Create translation container
        const translationDiv = document.createElement('div');
        translationDiv.className = 'glass-card card-entrance';
        translationDiv.style.cssText = 'margin-top: 1rem; padding: 1.5rem;';
        
        translationDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 class="accent-maroon" style="margin: 0; font-size: 1.125rem;">
                    Translation (${this.languages[this.currentLanguage]})
                </h3>
                <button id="hide-translation-btn" class="glass-btn" style="padding: 0.5rem 1rem;">
                    Hide
                </button>
            </div>
            
            <div class="translation-content" style="
                max-height: 300px;
                overflow-y: auto;
                padding: 1rem;
                background: var(--bg-tertiary);
                border-radius: 12px;
                font-size: 0.95rem;
                line-height: 1.6;
                white-space: pre-wrap;
            ">
                ${result.translated}
            </div>
        `;
        
        // Insert after original lyrics
        lyricsContainer.appendChild(translationDiv);
        
        // Hide button
        translationDiv.querySelector('#hide-translation-btn').addEventListener('click', () => {
            translationDiv.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => translationDiv.remove(), 300);
        });
        
        this.isVisible = true;
    }
    
    hideTranslation() {
        const translationDiv = document.querySelector('.translation-content');
        if (translationDiv) {
            translationDiv.closest('.glass-card').remove();
            this.isVisible = false;
        }
    }
    
    toggleTranslation() {
        if (this.isVisible) {
            this.hideTranslation();
        } else if (this.translatedLyrics) {
            this.displayTranslatedLyrics({
                translated: this.translatedLyrics,
                language: this.currentLanguage
            });
        }
    }
}

// Initialize
const translationManager = new TranslationManager();
window.translationManager = translationManager;
