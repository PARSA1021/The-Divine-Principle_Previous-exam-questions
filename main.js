/**
 * Application constants
 */
const CONSTANTS = {
    RESULTS_PER_PAGE: 10,
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 3000,
    ACCOUNT_NUMBER: "02060204230715",
    ACCOUNT_HOLDER: "국민은행 020602-04-230715 (예금주: 문성민)",
    PAGES: { HOME: 'home', WORKBOOK: 'workbook' },
    MAX_TEXT_LENGTH: 500,
    PREVIEW_START: 150,
    PREVIEW_END: 100,
    MAX_SEARCH_HISTORY: 10,
    SCROLL_DURATION: 600, // Scroll animation duration in ms
    HEADER_OFFSET: 80 // Adjust for fixed header height
};

/**
 * Global state management
 */
const state = {
    messages: [],
    currentCategory: localStorage.getItem('currentCategory') || '전체',
    searchHistory: JSON.parse(localStorage.getItem('searchHistory')) || [],
    currentPage: 1,
    debounceTimeout: null
};

/**
 * Cached DOM elements for performance
 */
const DOM = {
    searchInput: document.getElementById('search-input'),
    searchResults: document.getElementById('search-results'),
    searchStats: document.getElementById('search-stats'),
    searchLoading: document.getElementById('search-loading'),
    searchSuggestions: document.getElementById('search-suggestions'),
    progressBar: document.querySelector('.progress-bar div'),
    categoryButtons: document.querySelectorAll('.category-container button'),
    navButtons: document.querySelectorAll('.nav-bar button[data-page]'),
    backToTop: document.querySelector('.back-to-top'),
    clearSearch: document.getElementById('clear-search')
};

/**
 * Custom smooth scroll with easing
 * @param {number} targetY - Target scroll position
 * @param {number} duration - Animation duration
 */
const smoothScroll = (targetY, duration) => {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();
    const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        window.scrollTo(0, targetY);
        return;
    }

    const animation = currentTime => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = easeInOutQuad(progress);
        window.scrollTo(0, startY + distance * ease);
        if (progress < 1) requestAnimationFrame(animation);
    };
    requestAnimationFrame(animation);
};

/**
 * Toggle dark mode and save to localStorage
 */
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
};

/**
 * Scroll to top with smooth animation
 */
const scrollToTop = () => {
    smoothScroll(0, CONSTANTS.SCROLL_DURATION);
};

/**
 * Scroll to search results top
 */
const scrollToResultsTop = () => {
    if (DOM.searchResults) {
        const offsetTop = DOM.searchResults.getBoundingClientRect().top + window.scrollY - CONSTANTS.HEADER_OFFSET;
        smoothScroll(offsetTop, CONSTANTS.SCROLL_DURATION);
    }
};

/**
 * Copy account number to clipboard
 * @returns {Promise<void>}
 */
const copyAccountNumber = async () => {
    try {
        await navigator.clipboard.writeText(CONSTANTS.ACCOUNT_NUMBER);
        showToast('계좌번호가 복사되었습니다!');
    } catch (err) {
        console.error('계좌번호 복사 실패:', err);
        showToast(`계좌번호 복사 실패: ${CONSTANTS.ACCOUNT_HOLDER}`);
    }
};

/**
 * Copy message to clipboard with formatting
 * @param {string} text - Message text
 * @param {string} source - Message source
 * @param {string} category - Message category
 * @param {HTMLElement} element - Result item element
 * @returns {Promise<void>}
 */
const copyMessageToClipboard = async (text, source, category, element) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const useHundokFormat = confirm(`📅 ${today} 훈독 말씀 형식으로 복사할까요?\n\n✅ 확인: 훈독 형식\n❌ 취소: 기본 형식`);
        const formattedText = useHundokFormat
            ? `🌟${today} 훈독 말씀 🌟\n${text}\n\n📜 카테고리: ${category}\n📖 출처: ${source}\n——————————————————`
            : `🌟 말씀 🌟\n${text}\n\n📜 카테고리: ${category}\n📖 출처: ${source}\n——————————————————`;
        
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(formattedText);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = formattedText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        
        showToast('말씀과 출처가 복사되었습니다!');
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 1000);
    } catch (err) {
        console.error('텍스트 복사 실패:', err);
        showToast('텍스트 복사 실패. 수동으로 복사해 주세요.');
    }
};

/**
 * Show toast notification
 * @param {string} message - Message to display
 */
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    });
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, CONSTANTS.TOAST_DURATION);
};

/**
 * Load messages from messages.json
 * @returns {Promise<void>}
 */
const loadMessages = async () => {
    DOM.searchLoading.style.display = 'flex';
    DOM.progressBar.style.width = '20%';

    try {
        const response = await fetch('messages.json', { cache: 'no-store' });
        DOM.progressBar.style.width = '60%';
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        state.messages = await response.json();
        DOM.progressBar.style.width = '100%';

        state.messages = state.messages.map(msg => ({
            ...msg,
            category: msg.category || categorizeMessage(msg.source)
        }));
    } catch (error) {
        console.error('메시지 로드 실패:', error);
        DOM.searchResults.innerHTML = `
            <p class="no-results" role="alert">
                메시지 로드 실패. 네트워크를 확인하세요.
                <button onclick="loadMessages()" aria-label="다시 시도">다시 시도</button>
            </p>`;
    } finally {
        setTimeout(() => {
            DOM.searchLoading.style.display = 'none';
            DOM.progressBar.style.width = '0';
        }, 300);
    }
};

/**
 * Categorize message based on source
 * @param {string} source - Message source
 * @returns {string} - Category
 */
const categorizeMessage = (source) => {
    const categories = [
        { key: '천성경', value: '천성경' },
        { key: '참부모경', value: '참부모경' },
        { key: '참부모님 말씀', value: '참부모님 말씀' },
        { key: '참어머님 말씀', value: '참어머님 말씀' },
        { key: '천심원', value: '천심원' }
    ];
    return categories.find(cat => source.includes(cat.key))?.value || '전체';
};

/**
 * Highlight search query in text
 * @param {string} text - Original text
 * @param {string} query - Search query
 * @returns {string} - Highlighted HTML text
 */
const highlightText = (text, query) => {
    if (!query) return text;
    try {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'gi');
        return text.replace(regex, match => `<span class="highlight">${match}</span>`);
    } catch (e) {
        console.warn('유효하지 않은 정규식 쿼리:', e);
        return text;
    }
};

/**
 * Truncate long text with fade effect
 * @param {string} text - Original text
 * @param {string} query - Search query
 * @returns {string} - Truncated HTML text
 */
const truncateText = (text, query) => {
    if (text.length <= CONSTANTS.MAX_TEXT_LENGTH) {
        return highlightText(text, query);
    }
    const startText = text.slice(0, CONSTANTS.PREVIEW_START);
    const endText = text.slice(-CONSTANTS.PREVIEW_END);
    return `
        <span class="truncated-text">${highlightText(startText, query)}<span class="fade-out"></span></span>
        <span class="full-text" style="display: none;">${highlightText(text, query)}</span>
        <span class="fade-in"></span>${highlightText(endText, query)}
        <button class="toggle-text" onclick="toggleText(this)" aria-expanded="false" aria-label="전체 텍스트 보기">전체 보기</button>
    `;
};

/**
 * Toggle between truncated and full text
 * @param {HTMLElement} button - Toggle button
 */
const toggleText = (button) => {
    const resultItem = button.closest('.result-item');
    const truncatedText = resultItem.querySelector('.truncated-text');
    const fullText = resultItem.querySelector('.full-text');
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    truncatedText.style.display = isExpanded ? 'inline' : 'none';
    fullText.style.display = isExpanded ? 'none' : 'inline';
    button.textContent = isExpanded ? '전체 보기' : '접기';
    button.setAttribute('aria-expanded', !isExpanded);
    button.setAttribute('aria-label', isExpanded ? '전체 텍스트 보기' : '텍스트 접기');
};

/**
 * Render search suggestions
 */
const renderSearchSuggestions = () => {
    const query = DOM.searchInput.value.trim().toLowerCase();
    if (query && state.searchHistory.length > 0) {
        DOM.searchSuggestions.innerHTML = state.searchHistory
            .filter(q => q.toLowerCase().includes(query))
            .map(q => `<div class="suggestion" onclick="selectSuggestion('${q.replace(/'/g, "\\'")}')" role="option" tabindex="0">${q}</div>`)
            .join('');
        DOM.searchSuggestions.style.display = 'block';
    } else {
        DOM.searchSuggestions.style.display = 'none';
    }
};

/**
 * Select a search suggestion
 * @param {string} query - Selected query
 */
const selectSuggestion = (query) => {
    DOM.searchInput.value = query;
    DOM.searchSuggestions.style.display = 'none';
    searchMessages();
};

/**
 * Search messages and display paginated results
 * @param {number} page - Page number
 */
const searchMessages = (page = 1) => {
    clearTimeout(state.debounceTimeout);
    state.debounceTimeout = setTimeout(async () => {
        const query = DOM.searchInput.value.trim();
        DOM.searchLoading.style.display = 'flex';
        DOM.progressBar.style.width = '20%';
        DOM.searchResults.innerHTML = '';
        DOM.searchResults.style.display = 'none';
        DOM.searchStats.style.display = 'none';
        state.currentPage = page;

        let filteredMessages = state.messages;

        if (state.currentCategory !== '전체') {
            filteredMessages = filteredMessages.filter(msg => msg.category === state.currentCategory);
        }

        if (query) {
            const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            filteredMessages = filteredMessages.map(msg => ({
                ...msg,
                matchCount: (msg.text.match(queryRegex) || []).length
            })).filter(msg => msg.text.toLowerCase().includes(query.toLowerCase()));

            filteredMessages.sort((a, b) => b.matchCount - a.matchCount);

            if (!state.searchHistory.includes(query)) {
                state.searchHistory.unshift(query);
                if (state.searchHistory.length > CONSTANTS.MAX_SEARCH_HISTORY) {
                    state.searchHistory.pop();
                }
                localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
            }
        }

        const startTime = performance.now();
        DOM.progressBar.style.width = '60%';
        const startIndex = (page - 1) * CONSTANTS.RESULTS_PER_PAGE;
        const endIndex = startIndex + CONSTANTS.RESULTS_PER_PAGE;
        const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

        if (filteredMessages.length === 0 && (query || state.currentCategory !== '전체')) {
            DOM.searchResults.innerHTML = '<p class="no-results" role="alert">검색 결과가 없습니다.</p>';
            DOM.searchResults.style.display = 'block';
        } else if (paginatedMessages.length > 0) {
            DOM.searchResults.innerHTML = paginatedMessages.map(msg => {
                const displayText = truncateText(msg.text, query);
                const matchCount = msg.matchCount || 0;
                return `
                    <div class="result-item" role="listitem" tabindex="0">
                        <h3><i class="fas fa-book" aria-hidden="true"></i> ${msg.category}</h3>
                        <p>${displayText} ${matchCount > 0 && query ? `<span class="match-count" aria-label="일치 횟수 ${matchCount}회">${matchCount}</span>` : ''}</p>
                        <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${msg.source}</p>
                        <button class="copy-button" onclick="copyMessageToClipboard('${msg.text.replace(/'/g, "\\'")}', '${msg.source.replace(/'/g, "\\'")}', '${msg.category.replace(/'/g, "\\'")}', this.closest('.result-item'))" aria-label="${msg.category} 말씀과 출처 복사">
                            <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
                        </button>
                    </div>
                `;
            }).join('');

            if (filteredMessages.length > endIndex) {
                DOM.searchResults.innerHTML += `
                    <button onclick="searchMessages(${page + 1})" class="quiz-button blue next-page-button" aria-label="다음 페이지">다음 페이지</button>
                `;
            }
            DOM.searchResults.innerHTML += `
                <button class="back-to-top result-top" onclick="scrollToResultsTop()" aria-label="검색 결과 맨 위로 이동" style="position: static; margin: 1rem auto; display: block;">
                    <i class="fas fa-arrow-up" aria-hidden="true"></i> 맨 위로
                </button>
            `;
            DOM.searchResults.style.display = 'flex';
            DOM.searchResults.setAttribute('aria-live', 'polite');
        }

        const endTime = performance.now();
        DOM.searchStats.style.display = 'block';
        DOM.searchStats.innerHTML = `총 ${filteredMessages.length}개의 결과 (검색 시간: ${(endTime - startTime).toFixed(2)}ms)`;
        DOM.searchLoading.style.display = 'none';
        DOM.progressBar.style.width = '100%';
        setTimeout(() => {
            DOM.progressBar.style.width = '0';
            scrollToResultsTop();
        }, 300);
    }, CONSTANTS.DEBOUNCE_DELAY);
};

/**
 * Clear search input and reset category
 */
const clearSearch = () => {
    DOM.searchInput.value = '';
    state.currentCategory = '전체';
    localStorage.setItem('currentCategory', state.currentCategory);
    
    DOM.categoryButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === '전체');
        btn.setAttribute('aria-pressed', btn.getAttribute('data-category') === '전체' ? 'true' : 'false');
    });

    DOM.searchResults.innerHTML = '';
    DOM.searchResults.style.display = 'none';
    DOM.searchStats.style.display = 'none';
    DOM.searchSuggestions.style.display = 'none';
    DOM.clearSearch?.classList.add('shake');
    setTimeout(() => DOM.clearSearch?.classList.remove('shake'), 300);
    searchMessages();
};

/**
 * Show specified page
 * @param {string} pageId - Page ID to display
 */
const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelector(`#${pageId}`).classList.add('active');

    DOM.navButtons.forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-page') === pageId);
        button.setAttribute('aria-current', button.getAttribute('data-page') === pageId ? 'page' : 'false');
    });

    if (pageId === CONSTANTS.PAGES.WORKBOOK) {
        loadMessages().then(() => searchMessages());
    }
    scrollToTop();
};

/**
 * Start quiz page
 * @param {string} quizType - Quiz type
 */
const startQuiz = (quizType) => {
    const quizPages = {
        '원리강론': 'divine.html',
        '성경': 'bible.html'
    };
    const url = quizPages[quizType];
    if (url) {
        window.location.href = url;
    } else {
        console.error('유효하지 않은 퀴즈 유형:', quizType);
        showToast('퀴즈를 시작할 수 없습니다. 다시 시도하세요.');
    }
};

/**
 * Initialize application
 */
const initializeApp = () => {
    const initialCategoryButton = document.querySelector(`.category-container button[data-category="${state.currentCategory}"]`);
    if (initialCategoryButton) {
        initialCategoryButton.classList.add('active');
        initialCategoryButton.setAttribute('aria-pressed', 'true');
    }

    DOM.navButtons.forEach(button => {
        button.addEventListener('click', () => showPage(button.getAttribute('data-page')));
    });

    DOM.categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            DOM.categoryButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            this.classList.add('active');
            this.setAttribute('aria-pressed', 'true');
            state.currentCategory = this.getAttribute('data-category');
            localStorage.setItem('currentCategory', state.currentCategory);
            searchMessages();
        });
    });

    DOM.searchInput.addEventListener('input', renderSearchSuggestions);
    DOM.searchInput.addEventListener('focus', renderSearchSuggestions);
    DOM.searchInput.addEventListener('blur', () => {
        setTimeout(() => DOM.searchSuggestions.style.display = 'none', 200);
    });
    DOM.searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            searchMessages();
            DOM.searchSuggestions.style.display = 'none';
        }
    });

    DOM.searchSuggestions.addEventListener('keydown', e => {
        const suggestions = DOM.searchSuggestions.querySelectorAll('.suggestion');
        if (suggestions.length === 0) return;

        const currentIndex = Array.from(suggestions).findIndex(s => s === document.activeElement);
        let nextIndex = currentIndex;

        if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % suggestions.length;
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + suggestions.length) % suggestions.length;
            e.preventDefault();
        } else if (e.key === 'Enter' && currentIndex >= 0) {
            selectSuggestion(suggestions[currentIndex].textContent);
            e.preventDefault();
        }

        if (nextIndex !== currentIndex) {
            suggestions[nextIndex].focus();
        }
    });

    DOM.searchResults.addEventListener('keydown', e => {
        const results = DOM.searchResults.querySelectorAll('.result-item');
        if (results.length === 0) return;

        const currentIndex = Array.from(results).findIndex(r => r === document.activeElement);
        let nextIndex = currentIndex;

        if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % results.length;
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + results.length) % results.length;
            e.preventDefault();
        }

        if (nextIndex !== currentIndex) {
            results[nextIndex].focus();
        }
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (DOM.backToTop) {
                DOM.backToTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
                if (window.scrollY > 300) {
                    DOM.backToTop.classList.add('show');
                } else {
                    DOM.backToTop.classList.remove('show');
                }
            }
        }, 100);
    });

    document.querySelectorAll('button').forEach(element => {
        element.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                element.click();
            }
        });
    });

    if (DOM.clearSearch) {
        DOM.clearSearch.addEventListener('click', clearSearch);
    }

    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    showPage(CONSTANTS.PAGES.HOME);
};

document.addEventListener('DOMContentLoaded', initializeApp);