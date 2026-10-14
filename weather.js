// 天気APIに合わせて背景を動かす
(function () {
    function startWeather() {
        if (document.getElementById("weather-scene")) return;

        // 初期設定は横浜付近。
        // 現在地ボタンを押したときだけ位置情報を使う。
        var place = {
            latitude: 35.4437,
            longitude: 139.6380,
            name: "横浜付近"
        };

        var latestRequest = 0;
        var controller;
        var lastText = "";
        var lastUpdated = 0;

        if (!document.querySelector('meta[name="viewport"]')) {
            var viewport = document.createElement("meta");
            viewport.name = "viewport";
            viewport.content = "width=device-width, initial-scale=1.0";
            document.head.appendChild(viewport);
        }

        // 背景とパネルのデザイン
        var style = document.createElement("style");

        style.textContent = `
body.weather-enabled {
    margin: 0;
    background: #d5dfe9;
}

#weather-scene {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    background: linear-gradient(#a6c9e5, #e8f1f7);
    transition: background 1.5s;
}

.weather-sunny #weather-scene {
    background: linear-gradient(#69b7ed 0%, #bfe7ff 65%, #fff4dc 100%);
}

.weather-cloudy #weather-scene {
    background: linear-gradient(#879dad, #c2cfd6 65%, #e7edf0);
}

.weather-rainy #weather-scene {
    background: linear-gradient(#3e566c, #78929e 65%, #b0c2cd);
}

.weather-snowy #weather-scene {
    background: linear-gradient(#7792a8, #cbdbe6);
}

.weather-night #weather-scene {
    background: linear-gradient(#101d37, #263d5b 65%, #526881);
}

/* 太陽と月 */
#weather-scene .sun,
#weather-scene .moon {
    position: absolute;
    right: 8%;
    top: 9%;
    width: clamp(90px, 13vw, 170px);
    aspect-ratio: 1;
    border-radius: 50%;
    opacity: 0;
    transition: opacity 1s;
}

#weather-scene .sun {
    background: #ffe08b;
    box-shadow:
        0 0 55px 22px #ffedac90,
        0 0 130px 65px #ffefb84d;
    animation: weather-glow 7s ease-in-out infinite alternate;
}

#weather-scene .sun::before {
    content: "";
    position: absolute;
    inset: -48%;
    border-radius: 50%;
    background: repeating-conic-gradient(
        #ffe99b75 0deg 9deg,
        transparent 9deg 30deg
    );
    mask-image: radial-gradient(
        transparent 33%,
        #000 45%,
        transparent 72%
    );
    animation: weather-rays 70s linear infinite;
}

.weather-sunny:not(.weather-night) #weather-scene .sun {
    opacity: 1;
}

#weather-scene .moon {
    background: #f6f1d7;
    box-shadow: 0 0 50px #e8f4ff50;
}

.weather-sunny.weather-night #weather-scene .moon {
    opacity: 1;
}

/* 星 */
#weather-scene .star {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 0 6px white;
    animation: weather-twinkle 4s ease-in-out infinite alternate;
}

#weather-scene .stars {
    opacity: 0;
    transition: opacity 1s;
}

.weather-sunny.weather-night #weather-scene .stars {
    opacity: 1;
}

/* 雲 */
#weather-scene .clouds {
    opacity: .8;
    transition: opacity 1s;
}

#weather-scene .cloud {
    position: absolute;
    left: var(--x);
    top: var(--y);
    width: var(--width);
    height: calc(var(--width) * .27);
    border-radius: 50%;
    background: #e4eaf0;
    box-shadow: 0 18px 35px #364e6520;
    animation:
        weather-cloud var(--speed) ease-in-out
        var(--delay) infinite alternate;
}

#weather-scene .cloud::before,
#weather-scene .cloud::after {
    content: "";
    position: absolute;
    background: inherit;
    border-radius: 50%;
}

#weather-scene .cloud::before {
    width: 48%;
    height: 165%;
    left: 14%;
    bottom: 20%;
}

#weather-scene .cloud::after {
    width: 38%;
    height: 135%;
    right: 12%;
    bottom: 18%;
}

.weather-sunny #weather-scene .clouds {
    opacity: .3;
}

.weather-sunny #weather-scene .cloud:nth-child(n+4) {
    display: none;
}

.weather-rainy #weather-scene .cloud {
    background: #6f8393;
}

.weather-night #weather-scene .cloud {
    background: #3b4e65;
}

.weather-unknown #weather-scene .clouds {
    opacity: 0;
}

/* 雨と雪 */
#weather-scene .rain,
#weather-scene .snow {
    display: none;
    position: absolute;
    inset: 0;
}

.weather-rainy #weather-scene .rain,
.weather-snowy #weather-scene .snow {
    display: block;
}

#weather-scene .drop {
    position: absolute;
    left: var(--x);
    top: -50px;
    width: 2px;
    height: var(--length);
    border-radius: 4px;
    background: linear-gradient(transparent, #e0f2ffb8);
    opacity: var(--opacity);
    animation:
        weather-rain var(--speed) linear var(--delay) infinite;
}

#weather-scene .flake {
    position: absolute;
    left: var(--x);
    top: -20px;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: #ffffffdc;
    animation:
        weather-snow var(--speed) linear var(--delay) infinite;
}

/* 内容を背景の手前に表示する */
.weather-enabled main,
.weather-enabled footer {
    position: relative;
    z-index: 1;
    max-width: 1080px;
    margin-left: auto;
    margin-right: auto;
}

.weather-enabled main > section {
    background: #ffffffd9;
    border: 1px solid #ffffff8c;
    border-radius: 20px;
    margin: 22px 28px;
    padding: 26px;
    box-shadow: 0 12px 45px #18324912;
}

.weather-enabled #top {
    margin-top: 100px;
    padding-top: 26px;
}

.weather-enabled header {
    left: 0;
    z-index: 5;
    background: #ffffffe0;
    box-shadow: 0 2px 18px #15263d16;
}

.weather-enabled footer {
    background: #ffffffd9;
    border-radius: 20px;
    margin-top: 24px;
    margin-bottom: 30px;
    padding: 24px 28px;
    overflow-wrap: anywhere;
}

.weather-enabled .work-category {
    color: #526475;
}

/* 天気表示と現在地ボタン */
.weather-status {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px 18px;
    margin-top: 24px;
    padding-top: 18px;
    border-top: 1px solid #52647530;
}

.weather-status p {
    margin: 0;
}

#weather-status {
    font-size: 15px;
}

#weather-location {
    padding: 9px 14px;
    border: 0;
    border-radius: 8px;
    background: #243b53;
    color: white;
    font: inherit;
    cursor: pointer;
}

#weather-location:disabled {
    opacity: .55;
    cursor: wait;
}

.weather-credit,
.weather-location-note {
    font-size: 12px;
    color: #526475;
}

.weather-location-note {
    flex-basis: 100%;
}

.weather-credit a {
    text-decoration: underline;
}

/* アニメーション */
@keyframes weather-glow {
    to {
        transform: scale(1.06);
    }
}

@keyframes weather-rays {
    to {
        transform: rotate(360deg);
    }
}

@keyframes weather-twinkle {
    to {
        opacity: .3;
    }
}

@keyframes weather-cloud {
    from {
        transform: translateX(-75px);
    }
    to {
        transform: translateX(100px);
    }
}

@keyframes weather-rain {
    from {
        transform: translate3d(0, -60px, 0) rotate(14deg);
    }
    to {
        transform:
            translate3d(-24vw, calc(100vh + 110px), 0)
            rotate(14deg);
    }
}

@keyframes weather-snow {
    from {
        transform: translate3d(0, -20px, 0);
    }
    to {
        transform: translate3d(12vw, calc(100vh + 30px), 0);
    }
}

/* スマートフォン */
@media (max-width: 600px) {
    .weather-enabled header {
        padding: 0 18px;
    }

    .weather-enabled nav {
        gap: 14px;
    }

    .weather-enabled main > section {
        margin: 16px 12px;
        padding: 20px;
    }

    .weather-enabled #top {
        margin-top: 92px;
    }

    .weather-enabled .photo-switcher {
        flex-direction: column;
        align-items: stretch;
    }

    .weather-enabled .photos {
        width: 100%;
    }

    .weather-enabled #works-grid {
        grid-template-columns: 1fr;
    }

    .weather-enabled .works-controls {
        flex-direction: column;
    }

    .weather-enabled footer {
        margin: 16px 12px;
    }

    #weather-scene .sun,
    #weather-scene .moon {
        right: 5%;
        top: 5%;
    }
}

/* 動きを減らす設定に対応 */
@media (prefers-reduced-motion: reduce) {
    #weather-scene *,
    #weather-scene *::before {
        animation: none !important;
        transition: none !important;
    }

    #weather-scene .rain,
    #weather-scene .snow {
        display: none;
    }
}
`;

        document.head.appendChild(style);

        // 背景の要素を作る
        var scene = document.createElement("div");
        scene.id = "weather-scene";
        scene.setAttribute("aria-hidden", "true");

        scene.innerHTML =
            '<div class="sun"></div>' +
            '<div class="moon"></div>' +
            '<div class="stars"></div>' +
            '<div class="clouds"></div>' +
            '<div class="rain"></div>' +
            '<div class="snow"></div>';

        document.body.prepend(scene);
        document.body.classList.add("weather-enabled", "weather-unknown");

        // 位置や速度を変えて自然な動きを作る
        function particle(parent, name, properties) {
            var element = document.createElement("span");
            element.className = name;

            Object.keys(properties).forEach(function (key) {
                element.style.setProperty("--" + key, properties[key]);
            });

            parent.appendChild(element);
            return element;
        }

        // 雲
        for (var c = 0; c < 8; c++) {
            particle(scene.querySelector(".clouds"), "cloud", {
                x: (c * 17 - 22) + "%",
                y: (8 + c % 3 * 13) + "%",
                width: (240 + c % 4 * 85) + "px",
                speed: (22 + c * 4) + "s",
                delay: (-c * 7) + "s"
            });
        }

        // 雨粒
        var count = window.matchMedia("(max-width: 600px)").matches
            ? 65
            : 125;

        for (var i = 0; i < count; i++) {
            particle(scene.querySelector(".rain"), "drop", {
                x: (Math.random() * 125) + "%",
                length: (16 + Math.random() * 22) + "px",
                opacity: .3 + Math.random() * .6,
                speed: (.55 + Math.random() * .5) + "s",
                delay: (-Math.random() * 3) + "s"
            });
        }

        // 雪
        for (var s = 0; s < 45; s++) {
            particle(scene.querySelector(".snow"), "flake", {
                x: (Math.random() * 100) + "%",
                size: (3 + Math.random() * 5) + "px",
                speed: (7 + Math.random() * 9) + "s",
                delay: (-Math.random() * 18) + "s"
            });
        }

        // 星
        for (var t = 0; t < 28; t++) {
            var star = particle(scene.querySelector(".stars"), "star", {});
            star.style.left = (Math.random() * 100) + "%";
            star.style.top = (Math.random() * 72) + "%";
            star.style.animationDelay = (-Math.random() * 4) + "s";
        }

        // 天気表示・現在地ボタン・出典
        var panel = document.createElement("aside");
        panel.className = "weather-status";
        panel.setAttribute("aria-label", "現在の天気");

        panel.innerHTML = `
            <p id="weather-status" role="status" aria-live="polite">
                天気を読み込み中…
            </p>

            <button id="weather-location" type="button">
                現在地の天気に切り替える
            </button>

            <p class="weather-credit">
                Weather data:
                <a href="https://open-meteo.com/"
                   target="_blank"
                   rel="noopener noreferrer">Open-Meteo</a>
                /
                <a href="https://creativecommons.org/licenses/by/4.0/"
                   target="_blank"
                   rel="noopener noreferrer">CC BY 4.0</a>
                <br>
                天気データに基づいて背景を描画しています。
            </p>

            <p class="weather-location-note">
                現在地を使う場合は、位置情報をOpen-Meteoに送信して天気を取得します。
            </p>
        `;

        (
            document.getElementById("top") ||
            document.querySelector("main") ||
            document.body
        ).appendChild(panel);

        var status = document.getElementById("weather-status");
        var locationButton = document.getElementById("weather-location");

        // APIの天気コードを背景の種類に変換する
        function weatherType(code) {
            if (code === 0 || code === 1) {
                return { mode: "sunny", label: "晴れ" };
            }

            if (code === 2 || code === 3) {
                return { mode: "cloudy", label: "曇り" };
            }

            if (code === 45 || code === 48) {
                return { mode: "cloudy", label: "霧" };
            }

            if ([71, 73, 75, 77, 85, 86].includes(code)) {
                return { mode: "snowy", label: "雪" };
            }

            if ([
                51, 53, 55, 56, 57,
                61, 63, 65, 66, 67,
                80, 81, 82, 95, 96, 97, 99
            ].includes(code)) {
                return {
                    mode: "rainy",
                    label: code >= 95 ? "雷雨" : "雨"
                };
            }

            return { mode: "unknown", label: "天気不明" };
        }

        function applyWeather(current) {
            if (
                !current ||
                !Number.isInteger(current.weather_code) ||
                ![0, 1].includes(current.is_day)
            ) {
                throw new Error("天気データを読み取れませんでした");
            }

            var type = weatherType(current.weather_code);

            document.body.classList.remove(
                "weather-sunny",
                "weather-cloudy",
                "weather-rainy",
                "weather-snowy",
                "weather-unknown",
                "weather-night"
            );

            document.body.classList.add("weather-" + type.mode);

            if (current.is_day === 0) {
                document.body.classList.add("weather-night");
            }

            var temperature = Number.isFinite(current.temperature_2m)
                ? " · " + current.temperature_2m.toFixed(1) + "℃"
                : "";

            var time = typeof current.time === "string"
                ? current.time.slice(11, 16)
                : "";

            lastText =
                place.name + " · " + type.label +
                temperature +
                (time ? " · " + time + "のデータ" : "");

            status.textContent = lastText;
            lastUpdated = Date.now();
        }

        // 天気を取得する
        async function loadWeather() {
            var request = ++latestRequest;

            if (controller) controller.abort();

            controller = new AbortController();
            var activeController = controller;

            var timer = setTimeout(function () {
                activeController.abort();
            }, 12000);

            var url =
                "https://api.open-meteo.com/v1/forecast" +
                "?latitude=" + place.latitude +
                "&longitude=" + place.longitude +
                "&current=temperature_2m,weather_code,is_day" +
                "&timezone=auto";

            try {
                var response = await fetch(url, {
                    signal: activeController.signal
                });

                if (!response.ok) {
                    throw new Error("天気を取得できませんでした");
                }

                var data = await response.json();

                if (request === latestRequest) {
                    applyWeather(data.current);
                }
            } catch (error) {
                if (request === latestRequest) {
                    status.textContent = lastText
                        ? lastText + "（更新できませんでした）"
                        : "天気を取得できませんでした。時間を置いて再読み込みしてください。";
                }
            } finally {
                clearTimeout(timer);
            }
        }

        // ボタンを押したときだけ現在地を取得する
        locationButton.addEventListener("click", function () {
            if (!navigator.geolocation || !window.isSecureContext) {
                status.textContent =
                    "現在地の取得にはHTTPSでの公開、またはローカルサーバーが必要です。";
                return;
            }

            locationButton.disabled = true;
            status.textContent = "現在地を確認中…";

            navigator.geolocation.getCurrentPosition(
                function (position) {
                    place = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        name: "現在地"
                    };

                    locationButton.disabled = false;
                    loadWeather();
                },
                function () {
                    locationButton.disabled = false;

                    status.textContent = lastText
                        ? lastText + "（現在地を取得できませんでした）"
                        : "現在地を取得できなかったため、横浜付近の天気を取得します。";
                },
                {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });

        // 最初に天気を読み込む
        loadWeather();

        // ページを開いている間、15分ごとに更新する
        setInterval(function () {
            if (document.visibilityState === "visible") {
                loadWeather();
            }
        }, 15 * 60 * 1000);

        document.addEventListener("visibilitychange", function () {
            if (
                document.visibilityState === "visible" &&
                Date.now() - lastUpdated > 15 * 60 * 1000
            ) {
                loadWeather();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startWeather);
    } else {
        startWeather();
    }
})();