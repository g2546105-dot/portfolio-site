// 釣りの写真に隠れた魚。魚と水しぶきは、この機能用のSVG/CSSで描画。
// 外部の画像・音声・ライブラリは使いません。
(function () {
    "use strict";

    function startFishingEgg() {
        var grid = document.getElementById("works-grid");
        if (!grid || document.getElementById("fishing-egg-style")) return;

        var fishSVG = '<svg viewBox="0 0 120 64" aria-hidden="true" focusable="false">' +
            '<path d="M34 32 6 10 11 32 6 54Z" fill="#235a75" stroke="#103e57" stroke-width="2"/>' +
            '<path d="M48 21 61 4 73 19M49 44 65 59 74 43" fill="#235a75" stroke="#103e57" stroke-width="2"/>' +
            '<path d="M27 32Q53 0 93 17Q110 23 115 32Q104 46 83 49Q49 56 27 32Z" fill="#78b6c9" stroke="#103e57" stroke-width="2"/>' +
            '<path d="M33 33Q74 40 110 33Q94 51 69 48Q48 45 33 33Z" fill="#e4f3f5"/>' +
            '<path d="M80 23Q74 33 81 43M57 33 76 39 66 28" fill="none" stroke="#356d85" stroke-width="2" stroke-linecap="round"/>' +
            '<circle cx="99" cy="27" r="4" fill="#fff"/><circle cx="100" cy="27" r="2.3" fill="#102d42"/>' +
            '<path d="M109 35 115 32" stroke="#103e57" stroke-width="2" stroke-linecap="round"/></svg>';

        var splashSVG = '<svg viewBox="0 0 320 150" aria-hidden="true" focusable="false">' +
            '<path d="M160 129C126 106 97 139 56 121C86 112 77 94 43 66C84 72 104 97 114 107C102 76 104 49 91 16C131 42 124 74 149 91C153 67 170 45 183 8C194 50 174 84 180 103C206 67 238 48 275 45C247 65 229 91 222 111C244 98 277 102 310 116C264 124 225 137 160 129Z" fill="#74d9ff" fill-opacity=".64" stroke="#e6fbff" stroke-width="3" stroke-linejoin="round"/>' +
            '<path d="M79 119Q152 105 245 122M122 113Q155 101 198 113" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="4" stroke-linecap="round"/></svg>';

        var style = document.createElement("style");
        style.id = "fishing-egg-style";

        style.textContent = `
.work-card.fishing-egg-card {
    position: relative;
}

.fishing-hidden-fish {
    position: absolute;
    right: 9%;
    z-index: 2;
    width: 44px;
    height: 44px;
    padding: 5px;
    border: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: transparent;
    cursor: pointer;
    opacity: .48;
    touch-action: manipulation;
}

.fishing-hidden-fish svg {
    width: 34px;
    height: auto;
    transform: rotate(-16deg);
}

.fishing-hidden-fish:hover,
.fishing-hidden-fish:focus-visible {
    opacity: 1;
    background: #ffffff80;
}

.fishing-hidden-fish:focus-visible {
    outline: 3px solid #1e688d;
    outline-offset: 2px;
}

.fishing-hidden-fish:disabled {
    cursor: default;
    opacity: 0;
}

.fishing-hidden-fish[hidden] {
    display: none;
}

.fishing-splash-layer {
    position: fixed;
    inset: 0;
    z-index: 1000;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
}

.fishing-jumping-fish {
    position: absolute;
    left: 0;
    top: 0;
    width: 140px;
    filter: drop-shadow(0 8px 9px #14395240);
}

.fishing-jumping-fish svg,
.fishing-water-splash svg {
    display: block;
    width: 100%;
    height: auto;
}

.fishing-water-splash {
    position: absolute;
    width: min(420px, 90vw);
    transform: translate(-50%, -70%);
}

.fishing-water-wash {
    position: absolute;
    inset: 0;
    background: radial-gradient(
        ellipse,
        #d8f6ff66,
        #84d6f426 65%,
        transparent
    );
}

.fishing-water-drop,
.fishing-glass-drop {
    position: absolute;
    border-radius: 65% 35% 58% 42%;
    background: radial-gradient(
        ellipse at 30% 22%,
        #fff 0%,
        #cef2ffa6 25%,
        #69c5eb6b 70%
    );
    border: 1px solid #e8fbffb3;
    box-shadow: inset -1px -2px 3px #28749b38;
}

.fishing-glass-drop {
    box-shadow:
        inset 2px 3px 5px #ffffffb3,
        0 2px 5px #24749626;
}

.fishing-catch-message {
    position: absolute;
    bottom: 12%;
    left: 50%;
    transform: translateX(-50%);
    padding: 11px 20px;
    border-radius: 999px;
    background: #153f57ed;
    color: #fff;
    font: 600 16px/1.5 system-ui, sans-serif;
    white-space: nowrap;
}

.fishing-egg-announcement {
    position: fixed;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
}
`;

        document.head.appendChild(style);

        var announcement = document.createElement("p");
        announcement.className = "fishing-egg-announcement";
        announcement.setAttribute("role", "status");
        document.body.appendChild(announcement);

        var attached = new Map();
        var busy = false;
        var layer = null;
        var timers = [];
        var animations = [];

        var resizeObserver = typeof ResizeObserver === "function"
            ? new ResizeObserver(function () {
                attached.forEach(positionFish);
            })
            : null;

        // 写真の大きさに合わせて、隠れた魚の位置を決める。
        function positionFish(button, image) {
            button.hidden = image.offsetHeight === 0;

            button.style.top = (
                image.offsetTop +
                Math.max(
                    0,
                    Math.min(
                        image.offsetHeight - 44,
                        image.offsetHeight * .68 - 22
                    )
                )
            ) + "px";
        }

        // Worksが絞り込み・並べ替えで再描画されたときにも魚を付け直す。
        function attachFish() {
            attached.forEach(function (button, image) {
                if (!grid.contains(image)) {
                    if (resizeObserver) {
                        resizeObserver.unobserve(image);
                    }

                    attached.delete(image);
                }
            });

            grid.querySelectorAll(".work-card img").forEach(function (image) {
                var path = new URL(
                    image.getAttribute("src") || "",
                    document.baseURI
                ).pathname;

                if (
                    !path.endsWith("/media/fishing.jpg") ||
                    attached.has(image)
                ) {
                    return;
                }

                var card = image.closest(".work-card");
                var button = document.createElement("button");

                button.type = "button";
                button.className = "fishing-hidden-fish";
                button.setAttribute(
                    "aria-label",
                    "写真に隠れた魚を釣り上げる"
                );
                button.innerHTML = fishSVG;
                button.disabled = busy;

                card.classList.add("fishing-egg-card");

                // リンクの外に置き、魚を押してもリンク先へ移動しないようにする。
                card.appendChild(button);
                attached.set(image, button);
                positionFish(button, image);

                if (resizeObserver) {
                    resizeObserver.observe(image);
                }

                image.addEventListener("load", function () {
                    positionFish(button, image);
                }, { once: true });

                button.addEventListener("click", function (event) {
                    event.preventDefault();
                    playFishingEffect(button);
                });
            });
        }

        function later(callback, delay) {
            timers.push(setTimeout(callback, delay));
        }

        function animate(element, frames, options) {
            if (typeof element.animate === "function") {
                animations.push(element.animate(frames, options));
            }
        }

        function element(className, html) {
            var node = document.createElement("div");
            node.className = className;

            if (html) {
                node.innerHTML = html;
            }

            layer.appendChild(node);
            return node;
        }

        // 演出を終了し、水滴や魚を片付ける。
        function finish() {
            timers.forEach(clearTimeout);
            timers = [];

            animations.forEach(function (animation) {
                animation.cancel();
            });
            animations = [];

            if (layer) {
                layer.remove();
            }

            layer = null;
            busy = false;

            attached.forEach(function (button) {
                button.disabled = false;
            });
        }

        // 水しぶきと、画面に付く水滴。
        function splashAt(x, y, reduced) {
            var splash = element("fishing-water-splash", splashSVG);

            splash.style.left = x + "px";
            splash.style.top = y + "px";

            if (reduced) {
                return;
            }

            animate(splash, [
                {
                    opacity: 0,
                    transform: "translate(-50%, -70%) scale(.25)"
                },
                {
                    opacity: 1,
                    transform: "translate(-50%, -70%) scale(1)",
                    offset: .3
                },
                {
                    opacity: 0,
                    transform: "translate(-50%, -50%) scale(1.25)"
                }
            ], {
                duration: 750,
                fill: "forwards"
            });

            var wash = element("fishing-water-wash");

            animate(wash, [
                { opacity: 0 },
                { opacity: .65, offset: .25 },
                { opacity: 0 }
            ], {
                duration: 850,
                fill: "forwards"
            });

            var mobile = window.innerWidth <= 600;
            var count = mobile ? 26 : 42;
            var radius = Math.hypot(
                window.innerWidth,
                window.innerHeight
            ) * .62;

            // 水滴が画面全体へ飛び散る。
            for (var i = 0; i < count; i++) {
                var drop = element("fishing-water-drop");
                var angle = i / count * Math.PI * 2 + Math.random() * .2;
                var distance = radius * (.35 + Math.random() * .65);
                var size = 5 + Math.random() * 10;

                drop.style.cssText =
                    "left:" + x + "px;" +
                    "top:" + y + "px;" +
                    "width:" + size + "px;" +
                    "height:" + size * 1.7 + "px";

                var rotation = " rotate(" +
                    (angle * 180 / Math.PI + 90) +
                    "deg)";

                animate(drop, [
                    {
                        opacity: 0,
                        transform: "translate(0,0) scale(.3)" + rotation
                    },
                    {
                        opacity: .95,
                        offset: .15
                    },
                    {
                        opacity: 0,
                        transform: "translate(" +
                            Math.cos(angle) * distance + "px," +
                            (Math.sin(angle) * distance + 80) +
                            "px) scale(.7)" + rotation
                    }
                ], {
                    duration: 650 + Math.random() * 220,
                    fill: "forwards"
                });
            }

            // 画面のガラスに水が付いたような、ゆっくり落ちる水滴。
            for (var j = 0; j < (mobile ? 9 : 15); j++) {
                var glass = element("fishing-glass-drop");
                var width = 14 + Math.random() * 24;

                glass.style.cssText =
                    "left:" + (6 + Math.random() * 88) + "%;" +
                    "top:" + (8 + Math.random() * 70) + "%;" +
                    "width:" + width + "px;" +
                    "height:" + width * 1.6 + "px";

                animate(glass, [
                    {
                        opacity: 0,
                        transform: "translateY(0)"
                    },
                    {
                        opacity: .85,
                        offset: .18
                    },
                    {
                        opacity: 0,
                        transform: "translateY(55px)"
                    }
                ], {
                    duration: 1150,
                    delay: 130,
                    fill: "both"
                });
            }
        }

        function playFishingEffect(button) {
            if (busy) {
                return;
            }

            busy = true;

            attached.forEach(function (fishButton) {
                fishButton.disabled = true;
            });

            var rect = button.getBoundingClientRect();
            var width = window.innerWidth;
            var height = window.innerHeight;
            var x = width * .5;
            var y = height * .49;
            var size = Math.min(140, width * .34);

            layer = document.createElement("div");
            layer.className = "fishing-splash-layer";
            layer.setAttribute("aria-hidden", "true");
            document.body.appendChild(layer);

            announcement.textContent = "";

            later(function () {
                announcement.textContent = "隠れた魚を発見！";
            }, 20);

            var fish = element("fishing-jumping-fish", fishSVG);
            fish.style.width = size + "px";

            var reduced =
                window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                typeof fish.animate !== "function";

            // 端末で「動きを減らす」が有効な場合は静かな演出にする。
            if (reduced) {
                fish.style.transform =
                    "translate(" + (x - size / 2) + "px," +
                    (y - size * .7) + "px)";

                splashAt(x, y, true);
                element("fishing-catch-message", "隠れた魚を発見！");
                later(finish, 1200);
                return;
            }

            var startX = rect.left + rect.width / 2 - size / 2;
            var startY = rect.top + rect.height / 2 - size * .27;
            var apexY = Math.max(
                12,
                Math.min(startY, y) - Math.min(160, height * .22)
            );

            // 小さな魚が写真から跳び、手前へ大きく飛び出す。
            animate(fish, [
                {
                    opacity: 1,
                    transform: "translate(" +
                        startX + "px," + startY +
                        "px) scale(.26) rotate(-20deg)"
                },
                {
                    opacity: 1,
                    transform: "translate(" +
                        (x - size * .65) + "px," + apexY +
                        "px) scale(1) rotate(5deg)",
                    offset: .45
                },
                {
                    opacity: 1,
                    transform: "translate(" +
                        (x - size / 2) + "px," +
                        (y - size * .27) +
                        "px) scale(1.6) rotate(22deg)",
                    offset: .78
                },
                {
                    opacity: 0,
                    transform: "translate(" +
                        (x - size / 2) + "px," +
                        (y + 35) +
                        "px) scale(1.8) rotate(35deg)"
                }
            ], {
                duration: 820,
                fill: "forwards"
            });

            later(function () {
                splashAt(x, y, false);

                var message = element(
                    "fishing-catch-message",
                    "隠れた魚を発見！"
                );

                animate(message, [
                    { opacity: 0 },
                    { opacity: 1, offset: .2 },
                    { opacity: 1, offset: .8 },
                    { opacity: 0 }
                ], {
                    duration: 1350,
                    fill: "forwards"
                });
            }, 620);

            later(finish, 2150);
        }

        new MutationObserver(attachFish).observe(grid, {
            childList: true,
            subtree: true
        });

        window.addEventListener("resize", function () {
            attached.forEach(positionFish);

            if (busy) {
                finish();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && busy) {
                finish();
            }
        });

        document.addEventListener("visibilitychange", function () {
            if (document.hidden && busy) {
                finish();
            }
        });

        attachFish();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startFishingEgg,
            { once: true }
        );
    } else {
        startFishingEgg();
    }
})();