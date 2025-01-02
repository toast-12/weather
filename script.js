// dotenv 라이브러리를 사용하여 .env 파일의 환경 변수를 로드
require('dotenv').config();

const searchInput = document.querySelector('.search input');
const searchButton = document.querySelector('.search button');
const weatherInfo = document.querySelector('.weather-info');
const locationButton = document.querySelector('.location-btn');
const refreshButton = document.querySelector('.refresh-btn');
const lastUpdate = document.querySelector('.last-update');
const searchResults = document.querySelector('.search-results');
const weatherBox = document.querySelector('.weather-box');

// .env 파일에서 WEATHER_API_KEY를 가져옴
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// API URL 설정
const WEATHER_API_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// 3D 효과를 위한 변수들
let rafId = null;
let targetRotateX = 0;
let targetRotateY = 0;
let currentRotateX = 0;
let currentRotateY = 0;

// 한글-영어 도시 이름 매핑
const cityMapping = {
    // 한글:영어
    '서울': 'Seoul',
    '부산': 'Busan',
    '인천': 'Incheon',
    '대구': 'Daegu',
    '대전': 'Daejeon',
    '광주': 'Gwangju',
    '울산': 'Ulsan',
    '수원': 'Suwon',
    '제주': 'Jeju',
    '전주': 'Jeonju',
    '청주': 'Cheongju',
    '천안': 'Cheonan',
    '원주': 'Wonju',
    '춘천': 'Chuncheon',
    '강릉': 'Gangneung',
    '창원': 'Changwon'
};

// 영어-한글 도시 이름 매핑 (역방향 매핑)
const reverseCityMapping = Object.entries(cityMapping).reduce((acc, [kor, eng]) => {
    acc[eng] = kor;
    return acc;
}, {});

// 도시 이름 변환 함수
function translateCityName(cityName) {
    // 입력된 도시 이름이 한글인 경우
    if (cityMapping[cityName]) {
        return {
            english: cityMapping[cityName],
            korean: cityName
        };
    }
    // 입력된 도시 이름이 영어인 경우
    if (reverseCityMapping[cityName]) {
        return {
            english: cityName,
            korean: reverseCityMapping[cityName]
        };
    }
    // 매핑되지 않은 도시인 경우
    return {
        english: cityName,
        korean: cityName
    };
}

// 마지막 업데이트 시간 표시
function updateLastRefreshTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    lastUpdate.textContent = `마지막 업데이트: ${hours}:${minutes}`;
}

// 날씨 가져오기 함수 수정
async function getWeather(cityName) {
    weatherInfo.style.opacity = '0';
    const { english: englishCity } = translateCityName(cityName);
    
    try {
        const response = await fetch(
            `${WEATHER_API_BASE_URL}?q=${englishCity}&appid=${WEATHER_API_KEY}&units=metric&lang=kr`
        );
        const data = await response.json();
        
        if (response.ok) {
            displayWeather(data, cityName);
            updateLastRefreshTime();
        } else {
            alert('도시를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('에러:', error);
        alert('날씨 정보를 가져오는데 실패했습니다.');
    } finally {
        weatherInfo.style.opacity = '1';
    }
}

// 자동 위치 상태 변수 추가
let isLocationEnabled = false;

// 위치 기반 날씨 가져오기 함수 수정
function getLocation() {
    if (!isLocationEnabled) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async position => {
                    const { latitude, longitude } = position.coords;
                    try {
                        const response = await fetch(
                            `${WEATHER_API_BASE_URL}?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric&lang=kr`
                        );
                        const data = await response.json();
                        if (response.ok) {
                            displayWeather(data);
                            updateLastRefreshTime();
                            isLocationEnabled = true;
                            locationButton.classList.add('active');
                        }
                    } catch (error) {
                        console.error('위치 기반 날씨 가져오기 실패:', error);
                        displayDefaultWeather();
                    }
                },
                error => {
                    console.error('위치 가져오기 실패:', error);
                    displayDefaultWeather();
                }
            );
        }
    } else {
        isLocationEnabled = false;
        locationButton.classList.remove('active');
        displayDefaultWeather();
    }
}

// 기본 날씨 표시 함수 추가
function displayDefaultWeather() {
    weatherInfo.innerHTML = `
        <div class="last-update">마지막 업데이트: --</div>
        <h2 class="city">--</h2>
        <div class="temp">--°C</div>
        <div class="weather">--</div>
        <div class="minmax">
            <span class="min">바람: --km/h</span>
            <span class="max">날씨: --</span>
        </div>
    `;
}

// 날씨 표시
function displayWeather(data, originalCityName) {
    const temp = Math.round(data.main.temp);
    const description = data.weather[0].description;
    const windSpeed = Math.round(data.wind.speed * 3.6);
    
    // 원본 도시 이름이나 매핑된 한글 이름 사용
    const cityName = originalCityName || 
                    reverseCityMapping[data.name] || 
                    data.name;
    
    weatherInfo.innerHTML = `
        <div class="last-update">마지막 업데이트: ${new Date().toLocaleTimeString()}</div>
        <h2 class="city">${cityName}</h2>
        <div class="temp">${temp}°C</div>
        <div class="weather">${description}</div>
        <div class="minmax">
            <span class="min">바람: ${windSpeed}km/h</span>
            <span class="max">날씨: ${description}</span>
        </div>
    `;

    // 날씨에 따른 배경 변경
    updateBackground(data.weather[0].main.toLowerCase());
}

// 배경 업데이트 함수 수정
function updateBackground(weatherMain) {
    const body = document.body;
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 18;
    
    let gradient;
    switch(weatherMain) {
        case 'rain':
        case 'drizzle':
            gradient = 'var(--gradient-rainy)';
            break;
        case 'clouds':
            gradient = 'var(--gradient-cloudy)';
            break;
        case 'snow':
            gradient = 'linear-gradient(135deg, #e6e6e6, #ffffff)';
            break;
        default:
            gradient = isNight ? 'var(--gradient-night-clear)' : 'var(--gradient-day-clear)';
    }
    
    body.style.background = gradient;
}

// 검색 기능 수정
searchInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    if (value.length < 1) {
        searchResults.classList.remove('active');
        return;
    }

    const valueLower = value.toLowerCase();
    const filteredCities = Object.entries(cityMapping)
        .filter(([kor, eng]) => 
            kor.includes(value) || 
            eng.toLowerCase().includes(valueLower)
        );

    if (filteredCities.length > 0) {
        searchResults.innerHTML = filteredCities
            .map(([kor, eng]) => `
                <div class="search-result-item" data-city="${eng}" data-korean="${kor}">
                    ${kor} (${eng})
                </div>
            `).join('');
        searchResults.classList.add('active');
    } else {
        // 매핑되지 않은 도시 검색 시 직접 입력값 사용
        searchResults.innerHTML = `
            <div class="search-result-item" data-city="${value}" data-korean="${value}">
                ${value}
            </div>
        `;
        searchResults.classList.add('active');
    }
});

// 검색 결과 클릭 이벤트 수정
searchResults.addEventListener('click', (e) => {
    const item = e.target.closest('.search-result-item');
    if (item) {
        const city = item.dataset.city;
        const koreanName = item.dataset.korean;
        searchInput.value = koreanName;
        searchResults.classList.remove('active');
        getWeather(city);
    }
});

// 버튼 클릭 효과 수정
document.querySelectorAll('.controls button, .search button').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault(); // 기본 동작 방지
    });
});

// 3D 효과
document.addEventListener('mousemove', (e) => {
    const { left, top, width, height } = weatherBox.getBoundingClientRect();
    const mouseX = e.clientX - left;
    const mouseY = e.clientY - top;
    
    targetRotateY = ((mouseX - width/2) / width) * 15;
    targetRotateX = ((height/2 - mouseY) / height) * 15;
    
    if (!rafId) {
        rafId = requestAnimationFrame(updateRotation);
    }
});

function updateRotation() {
    const easing = 0.1;
    
    currentRotateX += (targetRotateX - currentRotateX) * easing;
    currentRotateY += (targetRotateY - currentRotateY) * easing;
    
    weatherBox.style.transform = `
        perspective(1000px)
        rotateX(${currentRotateX}deg)
        rotateY(${currentRotateY}deg)
        scale3d(1.02, 1.02, 1.02)
    `;
    
    if (
        Math.abs(targetRotateX - currentRotateX) > 0.01 ||
        Math.abs(targetRotateY - currentRotateY) > 0.01
    ) {
        rafId = requestAnimationFrame(updateRotation);
    } else {
        rafId = null;
    }
}

weatherBox.addEventListener('mouseleave', () => {
    targetRotateX = 0;
    targetRotateY = 0;
    if (!rafId) {
        rafId = requestAnimationFrame(updateRotation);
    }
});

searchButton.addEventListener('click', () => {
    const city = searchInput.value.trim();
    if (city) getWeather(city);
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = searchInput.value.trim();
        if (city) getWeather(city);
    }
});

locationButton.addEventListener('click', getLocation);

refreshButton.addEventListener('click', () => {
    const city = document.querySelector('.city').textContent;
    getWeather(city);
});

// 문서 클릭시 검색 결과 닫기
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) {
        searchResults.classList.remove('active');
    }
});

// 초기 로드 수정
// getLocation(); 를 제거하고 기본 날씨 표시
displayDefaultWeather();

// 마우스 빛 효과
weatherBox.addEventListener('mousemove', (e) => {
    const rect = weatherBox.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    weatherBox.style.setProperty('--x', x + '%');
    weatherBox.style.setProperty('--y', y + '%');
    weatherBox.style.setProperty('--light-opacity', '1');
});

weatherBox.addEventListener('mouseleave', () => {
    weatherBox.style.setProperty('--light-opacity', '0');
});

// 부드러운 페이드아웃을 위한 트랜지션
let fadeTimeout;
weatherBox.addEventListener('mouseenter', () => {
    clearTimeout(fadeTimeout);
    weatherBox.style.setProperty('--light-opacity', '1');
});

weatherBox.addEventListener('mouseleave', () => {
    // 부드러운 페이드아웃
    fadeTimeout = setTimeout(() => {
        weatherBox.style.setProperty('--light-opacity', '0');
    }, 100);
});

let isOutside = false;
let lastMouseX = 0;
let lastMouseY = 0;
let distanceFromBox = 0;
let elasticTimeout;

function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function updateElasticEffect(mouseX, mouseY, rect) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // 마우스와 박스 중심 사이의 거리 계산
    distanceFromBox = calculateDistance(mouseX, mouseY, centerX, centerY);
    const maxDistance = 100; // 최대 늘어나는 거리
    const elasticFactor = Math.min(1, distanceFromBox / maxDistance);
    
    // 마우스 방향으로의 왜곡 계산
    const directionX = (mouseX - centerX) / distanceFromBox;
    const directionY = (mouseY - centerY) / distanceFromBox;
    
    // 왜곡 효과 적용
    if (distanceFromBox < maxDistance) {
        const stretchX = directionX * (elasticFactor * 20); // 늘어나는 정도
        const stretchY = directionY * (elasticFactor * 20);
        const rotateX = -directionY * (elasticFactor * 10); // 회전 각도
        const rotateY = directionX * (elasticFactor * 10);
        
        weatherBox.style.transform = `
            perspective(1000px)
            translate(${stretchX}px, ${stretchY}px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(${1 + elasticFactor * 0.05})
        `;
        
        // 빛 효과도 함께 조절
        const lightX = ((mouseX - rect.left) / rect.width) * 100;
        const lightY = ((mouseY - rect.top) / rect.height) * 100;
        weatherBox.style.setProperty('--x', `${lightX}%`);
        weatherBox.style.setProperty('--y', `${lightY}%`);
        weatherBox.style.setProperty('--light-opacity', 1 - elasticFactor);
    } else {
        // 최대 거리를 넘어가면 원래 상태로 복귀
        resetBoxState();
    }
}

function resetBoxState() {
    weatherBox.style.transform = `
        perspective(1000px)
        translate(0, 0)
        rotateX(0deg)
        rotateY(0deg)
        scale(1)
    `;
    weatherBox.style.setProperty('--light-opacity', '0');
    isOutside = false;
}

weatherBox.addEventListener('mousemove', (e) => {
    const rect = weatherBox.getBoundingClientRect();
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    isOutside = false;
    clearTimeout(elasticTimeout);
    
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    weatherBox.style.setProperty('--x', `${x}%`);
    weatherBox.style.setProperty('--y', `${y}%`);
    weatherBox.style.setProperty('--light-opacity', '1');
});

document.addEventListener('mousemove', (e) => {
    if (!isOutside) {
        const rect = weatherBox.getBoundingClientRect();
        if (
            e.clientX < rect.left - 5 || 
            e.clientX > rect.right + 5 || 
            e.clientY < rect.top - 5 || 
            e.clientY > rect.bottom + 5
        ) {
            isOutside = true;
        }
    }
    
    if (isOutside) {
        updateElasticEffect(e.clientX, e.clientY, weatherBox.getBoundingClientRect());
    }
});

// 마우스가 빠르게 이동할 때의 처리
document.addEventListener('mouseleave', () => {
    elasticTimeout = setTimeout(resetBoxState, 100);
});
