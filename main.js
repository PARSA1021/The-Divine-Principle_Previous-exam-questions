/**
 * 상수 정의: 애플리케이션 전역에서 사용되는 상수
 */
const CONSTANTS = {
    RESULTS_PER_PAGE: 10,
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 3000,
    ACCOUNT_NUMBER: "02060204230715",
    ACCOUNT_HOLDER: "국민은행 020602-04-230715 (예금주: 문성민)",
    PAGES: {
        HOME: 'home',
        WORKBOOK: 'workbook'
    }
};

/**
 * 상태 관리: 애플리케이션의 전역 상태
 */
const state = {
    messages: [],
    currentCategory: localStorage.getItem('currentCategory') || '전체',
    searchHistory: JSON.parse(localStorage.getItem('searchHistory')) || [],
    currentPage: 1,
    debounceTimeout: null
};

/**
 * DOM 요소 캐싱: 성능 최적화를 위해 자주 사용되는 DOM 요소를 캐싱
 */
const DOM = {
    searchInput: () => document.getElementById('search-input'),
    searchResults: () => document.getElementById('search-results'),
    searchStats: () => document.getElementById('search-stats'),
    searchLoading: () => document.getElementById('search-loading'),
    searchSuggestions: () => document.getElementById('search-suggestions'),
    progressBar: () => document.querySelector('.progress-bar div'),
    categoryButtons: () => document.querySelectorAll('.category-container button'),
    navButtons: () => document.querySelectorAll('.nav-bar button[data-page]'),
    backToTop: () => document.querySelector('.back-to-top')
};

/**
 * 다크 모드를 토글하고 설정을 로컬 스토리지에 저장
 */
const toggleDarkMode = () => {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode') ? 'enabled' : 'disabled');
};

/**
 * 페이지 맨 위로 부드럽게 스크롤
 */
const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * 검색 결과 컨테이너 상단으로 부드럽게 스크롤
 */
const scrollToResultsTop = () => {
    const resultsContainer = DOM.searchResults();
    if (resultsContainer) {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

/**
 * 계좌번호를 클립보드에 복사하고 결과를 토스트로 표시
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
 * 텍스트, 출처, 카테고리를 포맷팅하여 클립보드에 복사하고 결과를 토스트로 표시
 * @param {string} text - 복사할 텍스트
 * @param {string} source - 텍스트의 출처
 * @param {string} category - 텍스트의 카테고리
 * @returns {Promise<void>}
 */
const copyMessageToClipboard = async (text, source, category) => {
    try {
        // 텍스트, 출처, 카테고리를 세련되게 포맷팅
        const formattedText = `🌟 말씀 🌟\n${text}\n\n📜 카테고리: ${category}\n📖 출처: ${source}\n——————————————————`;
        await navigator.clipboard.writeText(formattedText);
        showToast('말씀과 출처가 복사되었습니다!');
    } catch (err) {
        console.error('텍스트 복사 실패:', err);
        showToast('텍스트 복사 실패. 수동으로 복사해 주세요.');
    }
};

/**
 * 토스트 메시지 표시
 * @param {string} message - 표시할 메시지
 */
const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, CONSTANTS.TOAST_DURATION);
};

/**
 * messages.json에서 데이터를 비동기적으로 로드하고 카테고리 정규화
 * @returns {Promise<void>}
 */
const loadMessages = async () => {
    const { searchLoading, progressBar } = DOM;
    searchLoading().style.display = 'flex';
    progressBar().style.width = '20%';

    try {
        const response = await fetch('messages.json', { cache: 'no-store' });
        progressBar().style.width = '60%';
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        state.messages = await response.json();
        progressBar().style.width = '100%';

        state.messages = state.messages.map(msg => ({
            ...msg,
            category: msg.category || categorizeMessage(msg.source)
        }));
    } catch (error) {
        console.error('메시지 로드 실패:', error);
        DOM.searchResults().innerHTML = `
            <p class="no-results" role="alert">
                메시지 로드 실패. 네트워크를 확인하세요.
                <button onclick="loadMessages()" aria-label="다시 시도">다시 시도</button>
            </p>`;
    } finally {
        setTimeout(() => {
            searchLoading().style.display = 'none';
            progressBar().style.width = '0';
        }, 300);
    }
};

/**
 * 메시지 소스를 기반으로 카테고리 결정
 * @param {string} source - 메시지 소스
 * @returns {string} - 결정된 카테고리
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
 * 검색 쿼리에 맞는 텍스트를 하이라이트
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색 쿼리
 * @returns {string} - 하이라이트된 HTML 텍스트
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
 * 검색어 제안 렌더링
 */
const renderSearchSuggestions = () => {
    const input = DOM.searchInput();
    const suggestionsContainer = DOM.searchSuggestions();
    if (input.value.trim() && state.searchHistory.length > 0) {
        suggestionsContainer.innerHTML = state.searchHistory
            .filter(query => query.toLowerCase().includes(input.value.toLowerCase()))
            .map(query => `<div onclick="selectSuggestion('${query.replace(/'/g, "\\'")}')" role="option" tabindex="0">${query}</div>`)
            .join('');
        suggestionsContainer.style.display = 'block';
    } else {
        suggestionsContainer.style.display = 'none';
    }
};

/**
 * 검색 제안을 선택하고 검색 실행
 * @param {string} query - 선택된 검색 쿼리
 */
const selectSuggestion = (query) => {
    DOM.searchInput().value = query;
    DOM.searchSuggestions().style.display = 'none';
    searchMessages();
};

/**
 * 메시지 검색 및 페이지네이션 결과 표시
 * @param {number} page - 표시할 페이지 번호
 */
const searchMessages = (page = 1) => {
    clearTimeout(state.debounceTimeout);
    state.debounceTimeout = setTimeout(async () => {
        const { searchInput, searchResults, searchStats, searchLoading, progressBar } = DOM;
        const query = searchInput().value.trim();
        
        searchLoading().style.display = 'flex';
        progressBar().style.width = '20%';
        searchResults().innerHTML = '';
        searchResults().style.display = 'none';
        searchStats().style.display = 'none';
        state.currentPage = page;

        let filteredMessages = state.messages;

        if (state.currentCategory !== '전체') {
            filteredMessages = filteredMessages.filter(msg => msg.category === state.currentCategory);
        }

        if (query) {
            filteredMessages = filteredMessages.map(msg => {
                const queryRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                const matchCount = (msg.text.match(queryRegex) || []).length;
                return { ...msg, matchCount };
            }).filter(msg => msg.text.toLowerCase().includes(query.toLowerCase()));

            // 관련도순 정렬 (matchCount 기준 내림차순)
            filteredMessages.sort((a, b) => b.matchCount - a.matchCount);

            if (!state.searchHistory.includes(query)) {
                state.searchHistory.unshift(query);
                if (state.searchHistory.length > 5) state.searchHistory.pop();
                localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
            }
        }

        const startTime = performance.now();
        progressBar().style.width = '60%';
        const startIndex = (page - 1) * CONSTANTS.RESULTS_PER_PAGE;
        const endIndex = startIndex + CONSTANTS.RESULTS_PER_PAGE;
        const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

        if (filteredMessages.length === 0 && (query || state.currentCategory !== '전체')) {
            searchResults().innerHTML = '<p class="no-results" role="alert">검색 결과가 없습니다.</p>';
            searchResults().style.display = 'block';
        } else if (paginatedMessages.length > 0) {
            searchResults().innerHTML = paginatedMessages.map(msg => {
                const highlightedText = highlightText(msg.text, query);
                const matchCount = msg.matchCount || 0;
                return `
                    <div class="result-item" role="listitem">
                        <h3><i class="fas fa-book" aria-hidden="true"></i> ${msg.category}</h3>
                        <p>${highlightedText} ${matchCount > 0 && query ? `<span class="match-count" aria-label="일치 횟수 ${matchCount}회">${matchCount}</span>` : ''}</p>
                        <p class="source"><i class="fas fa-bookmark" aria-hidden="true"></i> ${msg.source}</p>
                        <button class="copy-button" onclick="copyMessageToClipboard('${msg.text.replace(/'/g, "\\'")}', '${msg.source.replace(/'/g, "\\'")}', '${msg.category.replace(/'/g, "\\'")}')" aria-label="${msg.category} 말씀과 출처 복사">
                            <i class="fas fa-copy" aria-hidden="true"></i> 복사하기
                        </button>
                    </div>
                `;
            }).join('');

            if (filteredMessages.length > endIndex) {
                searchResults().innerHTML += `
                    <button onclick="searchMessages(${page + 1})" class="quiz-button blue next-page-button" aria-label="다음 페이지">다음 페이지</button>
                `;
            }
            searchResults().innerHTML += `
                <button class="back-to-top" onclick="scrollToResultsTop()" aria-label="검색 결과 맨 위로 이동" style="position: static; margin: 1rem auto; display: block;">
                    <i class="fas fa-arrow-up" aria-hidden="true"></i> 맨 위로
                </button>
            `;
            searchResults().style.display = 'flex';
        }

        const endTime = performance.now();
        searchStats().style.display = 'block';
        searchStats().innerHTML = `총 ${filteredMessages.length}개의 결과 (검색 시간: ${(endTime - startTime).toFixed(2)}ms)`;
        searchLoading().style.display = 'none';
        progressBar().style.width = '100%';
        setTimeout(() => {
            progressBar().style.width = '0';
            scrollToResultsTop();
        }, 300);
    }, CONSTANTS.DEBOUNCE_DELAY);
};

/**
 * 검색 입력과 카테고리 초기화
 */
const clearSearch = () => {
    const { searchInput, searchResults, searchStats, searchSuggestions } = DOM;
    searchInput().value = '';
    state.currentCategory = '전체';
    localStorage.setItem('currentCategory', state.currentCategory);
    
    DOM.categoryButtons().forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === '전체');
        btn.setAttribute('aria-pressed', btn.getAttribute('data-category') === '전체' ? 'true' : 'false');
    });

    searchResults().innerHTML = '';
    searchResults().style.display = 'none';
    searchStats().style.display = 'none';
    searchSuggestions().style.display = 'none';
    searchMessages();
};

/**
 * 지정된 페이지 표시 및 내비게이션 상태 업데이트
 * @param {string} pageId - 표시할 페이지 ID
 */
const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelector(`#${pageId}`).classList.add('active');

    DOM.navButtons().forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-page') === pageId);
        button.setAttribute('aria-current', button.getAttribute('data-page') === pageId ? 'page' : 'false');
    });

    if (pageId === CONSTANTS.PAGES.WORKBOOK) {
        loadMessages().then(() => searchMessages());
    }
    scrollToTop();
};

/**
 * 퀴즈 페이지 시작
 * @param {string} quizType - 퀴즈 유형 ('원리강론' 또는 '성경')
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
 * 애플리케이션 초기화 및 이벤트 리스너 설정
 */
const initializeApp = () => {
    // 초기 카테고리 버튼 활성화
    const initialCategoryButton = document.querySelector(`.category-container button[data-category="${state.currentCategory}"]`);
    if (initialCategoryButton) {
        initialCategoryButton.classList.add('active');
        initialCategoryButton.setAttribute('aria-pressed', 'true');
    }

    // 내비게이션 버튼 이벤트 리스너
    DOM.navButtons().forEach(button => {
        button.addEventListener('click', () => showPage(button.getAttribute('data-page')));
    });

    // 카테고리 버튼 이벤트 리스너
    DOM.categoryButtons().forEach(button => {
        button.addEventListener('click', function() {
            DOM.categoryButtons().forEach(btn => {
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

    // 검색 입력 이벤트 리스너
    const searchInput = DOM.searchInput();
    searchInput.addEventListener('input', renderSearchSuggestions);
    searchInput.addEventListener('focus', renderSearchSuggestions);
    searchInput.addEventListener('blur', () => {
        setTimeout(() => DOM.searchSuggestions().style.display = 'none', 200);
    });
    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            searchMessages();
            DOM.searchSuggestions().style.display = 'none';
        }
    });

    // 검색 제안 키보드 내비게이션
    DOM.searchSuggestions().addEventListener('keydown', e => {
        const suggestions = DOM.searchSuggestions().querySelectorAll('div[role="option"]');
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

    // 스크롤 이벤트: 맨 위로 버튼 표시
    window.addEventListener('scroll', () => {
        const backToTop = DOM.backToTop();
        if (backToTop) {
            backToTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
        }
    });

    // 버튼 키보드 접근성
    document.querySelectorAll('button').forEach(element => {
        element.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                element.click();
            }
        });
    });

    // 다크 모드 초기화
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
    }

    // 초기 페이지 표시
    showPage(CONSTANTS.PAGES.HOME);
};

// DOMContentLoaded 이벤트에 초기화 함수 연결
document.addEventListener('DOMContentLoaded', initializeApp);