const profilesKey = 'proxyProfile'; // Ключ для сохранения профилей в chrome.storage

// Загрузка профилей из chrome.storage
function loadProfiles() {
    chrome.storage.local.get([profilesKey], function(result) {
        const profiles = result[profilesKey] || [];
        const container = document.getElementById('profiles-container');
        
        if (!container) {
            console.error('Контейнер для профилей не найден.');
            return;
        }
        
        container.innerHTML = ''; // Очищаем контейнер

        profiles.forEach(profile => {
            const profileDiv = document.createElement('div');
            profileDiv.className = 'profile';
            profileDiv.innerHTML = `
                <span style="font-size: 20px;">${profile.ip}:${profile.port}</span>
                <div class="profile-buttons">
                    <label class="switch">
                        <input type="checkbox" id="toggle-${profile.id}" ${profile.isActive ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <button class="default-btn" style="background: #dc3545; margin-left: 10px;" id="delete-${profile.id}"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6M18 6V16.2C18 17.8802 18 18.7202 17.673 19.362C17.3854 19.9265 16.9265 20.3854 16.362 20.673C15.7202 21 14.8802 21 13.2 21H10.8C9.11984 21 8.27976 21 7.63803 20.673C7.07354 20.3854 6.6146 19.9265 6.32698 19.362C6 18.7202 6 17.8802 6 16.2V6M14 10V17M10 10V17" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>
                </div>
            `;
            container.appendChild(profileDiv);

            // Назначаем обработчик событий для тумблера
            const toggleSwitch = document.getElementById(`toggle-${profile.id}`);
            if (toggleSwitch) {
                toggleSwitch.addEventListener('change', () => toggleProfile(profile.id));
            }

            // Назначаем обработчик событий для кнопки удаления
            const deleteBtn = document.getElementById(`delete-${profile.id}`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deleteProfile(profile.id));
            }
        });
    });
}

function turnOnProxy(ip, port) {
    // Получаем bypassDomains из chrome.storage.local
    chrome.storage.local.get("ignoreDomains", function (data) {
        let bypassDomains = data.ignoreDomains || []; // Если нет данных, используем пустой массив
        bypassDomains = bypassDomains.flatMap(domain => {
            if (domain.startsWith("*.")) {
                return [domain, domain.slice(2)];  // Убираем звездочку и точку, оставляем только домен
            }
            return ["*." + domain, domain];  // Добавляем звездочку и точку, и сам домен
        });
        
        
        console.log("bypassDomains ", bypassDomains);

        var config = {
            mode: 'fixed_servers',
            rules: {
                singleProxy: {
                    scheme: 'http',
                    host: ip,
                    port: parseInt(port)
                },
                bypassList: bypassDomains
            }
        };

        chrome.proxy.settings.set({ value: config, scope: 'regular' }, function () {
            console.log('Proxy applied with bypass domains:', config);
        });
        
        chrome.proxy.onProxyError.addListener(function (error) {
            console.error('Proxy error:', error);
        });
        
    });
}


function turnOffProxy() {
    chrome.proxy.settings.clear({ scope: 'regular' }, function() {
        console.log('Proxy removed');
    });
}

function saveProfiles(profiles) {
    chrome.storage.local.set({ [profilesKey]: profiles }, function() {
        loadProfiles(); // Перезагружаем профили
    });
}

function toggleProfile(id) {
    chrome.storage.local.get([profilesKey], function(result) {
        const profiles = result[profilesKey] || [];
        const profile = profiles.find(p => p.id === id);
		
        if (profile) {
            profile.isActive = !profile.isActive;

            // Если тумблер включен, выключаем все остальные профили
            if (profile.isActive) {
                profiles.forEach(p => {
                    if (p.id !== id && p.isActive) {
                        p.isActive = false; // Отключаем другие профили
                    }
                });

                turnOnProxy(profile.ip, profile.port); // Включаем текущий профиль
            } else {
                turnOffProxy(); // Выключаем текущий профиль
            }

            // Сохраняем обновленные профили
            saveProfiles(profiles);
        }
    });
}

function updateProfileUI(profiles) {
    profiles.forEach(profile => {
        const toggleSwitch = document.getElementById(`toggle-${profile.id}`);
        if (toggleSwitch) {
            toggleSwitch.checked = profile.isActive; // Устанавливаем состояние тумблера
        }
    });
}

function deleteProfile(id) {
    chrome.storage.local.get([profilesKey], function(result) {
        const profiles = result[profilesKey] || [];
        const profile = profiles.find(p => p.id === id);
        if (profile && profile.isActive) {
            turnOffProxy();
        }
        const updatedProfiles = profiles.filter(p => p.id !== id);
        saveProfiles(updatedProfiles);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Загрузка профилей при открытии всплывающего окна
    loadProfiles();

    document.getElementById('add-profile-btn').addEventListener('click', () => {
        const ip = document.getElementById('ip').value;
        const port = document.getElementById('port').value;

        if (ip && port) {
            chrome.storage.local.get([profilesKey], function(result) {
                const profiles = result[profilesKey] || [];
                const newProfile = {
                    id: profiles.length + 1,
                    name: `Proxy ${profiles.length + 1}`,
                    ip: ip,
                    port: port,
                    isActive: false
                };
                profiles.push(newProfile);
                saveProfiles(profiles);

                // Очищаем поля формы после добавления профиля
                document.getElementById('ip').value = '';
                document.getElementById('port').value = '';
            });
        } else {
            alert('Пожалуйста, введите IP и порт.');
        }
    });

    const toggleButton = document.getElementById("toggle-ignore-list-btn");
    const profilesContainer = document.getElementById("profiles-container");
    const addProfileForm = document.getElementById("add-profile-form");
    const addIgnoreDomainForm = document.getElementById("add-ignore-domain-form");
    const ignoreDomainsContainer = document.getElementById("ignore-domains-container");

    let isIgnoreListVisible = false;

    toggleButton.addEventListener("click", function () {
        isIgnoreListVisible = !isIgnoreListVisible;

        if (isIgnoreListVisible) {
            // Скрыть весь контент, кроме игнор-листа
            profilesContainer.style.display = "none";
            addProfileForm.style.display = "none";
            addIgnoreDomainForm.style.display = "block";
            ignoreDomainsContainer.style.display = "block";

            toggleButton.textContent = "Вернуться";
            renderIgnoreDomains();
        } else {
            // Показать основной контент, скрыть игнор-лист
            profilesContainer.style.display = "block";
            addProfileForm.style.display = "block";
            addIgnoreDomainForm.style.display = "block";
            ignoreDomainsContainer.style.display = "none";

            toggleButton.textContent = "Посмотреть Игнор лист";
        }
    });

    const addIgnoreDomainBtn = document.getElementById("add-ignore-domain-btn");
    const ignoreDomainInput = document.getElementById("ignore-domain");
    const ignoreDomainsList = document.getElementById("ignore-domains-list");

    // Функция для обновления списка игнорируемых доменов в интерфейсе
    function renderIgnoreDomains() {
        chrome.storage.local.get("ignoreDomains", function (data) {
            const domains = data.ignoreDomains || [];
            ignoreDomainsList.innerHTML = ""; // Очищаем список
            domains.forEach(domain => {
                const domainItem = document.createElement("div");
                domainItem.className = "ignore-domain-item";
                domainItem.textContent = domain;

                const removeBtn = document.createElement("button");
                removeBtn.textContent = "Удалить";
                removeBtn.className = "remove-domain-btn";
                removeBtn.style.marginLeft = "10px";

                // Обработчик для удаления домена
                removeBtn.addEventListener("click", function () {
                    removeIgnoreDomain(domain);
                });

                domainItem.appendChild(removeBtn);
                ignoreDomainsList.appendChild(domainItem);
            });
        });
    }

    // Функция для добавления нового домена
    function addIgnoreDomain(domain) {
        chrome.storage.local.get("ignoreDomains", function (data) {
            const domains = data.ignoreDomains || [];
            console.log("domains ", domains);
            if (!domains.includes(domain)) {
                domains.push(domain);
                chrome.storage.local.set({ ignoreDomains: domains }, function () {
                    renderIgnoreDomains();
                    console.log("Domain added:", domain);
                });
            }
        });
    }

    // Функция для удаления домена
    function removeIgnoreDomain(domain) {
        chrome.storage.local.get("ignoreDomains", function (data) {
            const domains = data.ignoreDomains || [];
            const updatedDomains = domains.filter(d => d !== domain);
            chrome.storage.local.set({ ignoreDomains: updatedDomains }, function () {
                renderIgnoreDomains();
                console.log("Domain removed:", domain);
            });
           
        });
    }

    // Обработчик кнопки добавления
    addIgnoreDomainBtn.addEventListener("click", function () {
        const domain = ignoreDomainInput.value.trim();
        if (domain) {
            addIgnoreDomain(domain);
            ignoreDomainInput.value = ""; // Очищаем поле
        } else {
            alert("Введите корректный домен.");
        }
    });


    // Изначально игнор-лист скрыт
    ignoreDomainsContainer.style.display = "none";
});

