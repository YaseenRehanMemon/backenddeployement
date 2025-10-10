module.exports = {
    // PDF Configuration
    PDF: {
        PAGE_SIZE: 'A4',
        MARGINS: {
            top: 50,
            bottom: 50,
            left: 60,
            right: 60
        },
        FONTS: {
            TITLE: 18,
            SUBTITLE: 14,
            BODY: 11,
            SMALL: 10,
            MIN: 9
        },
        MAX_PAGES: 2
    },
    
    // File Limits
    UPLOAD: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_FILES: 10,
        ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    },
    
    // AI Configuration
    AI: {
        MODEL: 'gemini-1.5-flash',
        MAX_TOKENS: 4000,
        TEMPERATURE: 0.3
    },
    
    // College Info
    COLLEGE: {
        NAME: 'Govt. Degree College Hingorja',
        LOGO_PATH: './assets/logo.png',
        DEFAULT_INSTRUCTOR: 'Prof. Ahmed Khan',
        DEFAULT_SUBJECT: 'Mathematics',
        DEFAULT_CLASS: 'XI'
    }
};