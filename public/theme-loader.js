// Default theme settings
const defaultTheme = {
    colors: {
        primary: '#007bff',
        background: '#ffffff',
        text: '#333333'
    },
    content: {
        heroTitle: '215 WEB CONNECT',
        heroSubtitle: 'Building Digital Excellence'
    }
};

// Function to apply theme
function applyTheme(theme) {
    const colors = theme?.colors || defaultTheme.colors;
    const content = theme?.content || defaultTheme.content;

    // Apply colors
    document.documentElement.style.setProperty('--primary-color', colors.primary);
    document.documentElement.style.setProperty('--bg-color', colors.background);
    document.documentElement.style.setProperty('--text-color', colors.text);
    
    // Apply content
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    
    if (heroTitle) heroTitle.innerText = content.heroTitle;
    if (heroSubtitle) heroSubtitle.innerText = content.heroSubtitle;
}

// Load theme settings
fetch('/theme-settings.json')
    .then(res => res.json())
    .then(data => {
        applyTheme(data.theme);
    })
    .catch(error => {
        console.log('Using default theme settings');
        applyTheme(defaultTheme);
    });
