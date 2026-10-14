// 射撃の写真に隠れた銃弾。
// 銃弾とひびは、この機能用のSVG/CSSで描画。
// 外部の画像・音声・ライブラリは使いません。
(function () {
    "use strict";

    function startShootingEgg() {
        var grid = document.getElementById("works-grid");

        if (!grid || document.getElementById("shooting-egg-style")) return;

        var bulletSVG = '<svg viewBox="0 0 120 48" aria-hidden="true" focusable="false">' +
            '<path d="M18 13H72Q94 13 113 24Q94 35 72 35H18Z" fill="#bb7a3f" stroke="#654225" stroke-width="2"/>' +
            '<path d="M20 16H73Q90 16 105 23H20Z" fill="#f6d39c"/>' +
            '<path d="M20 29H77Q93 29 106 25Q92 34 72 34H20Z" fill="#8d542d"/>' +
            '<path d="M17 12H28V36H17Z" fill="#d8ac60" stroke="#654225" stroke-width="2"/>' +
            '<path d="M18 17H27" stroke="#fff0bb" stroke-width="3"/></svg>';

        var style = document.createElement("style");
        style.id = "shooting-egg-style";

        style.textContent = `
.work-card.shooting-egg-card {
    position: relative;
}

.shooting-hidden-bullet {
    position: absolute;
    right: 10%;
    z-index: 2;
    width: 44px;
    height: 44px;
    padding: 5px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    display: grid;
    place-items: center;
    opacity: .48;
    cursor: pointer;
    touch-action: manipulation;
}

.shooting-hidden-bullet svg {
    display: block;
    width: 34px;
    height: auto;
    transform: rotate(-24deg);
}

.shooting-hidden-bullet:hover,
.shooting-hidden-bullet:focus-visible {
    opacity: 1;
    background: #ffffff80;
}

.shooting-hidden-bullet:focus-visible {
    outline: 3px solid #a66d29;
    outline-offset: 2px;
}

.shooting-hidden-bullet:disabled {
    opacity: 0;
    cursor: default;
}

.shooting-hidden-bullet[hidden] {
    display: none;
}

.shooting-crack-layer {
    position: fixed;
    inset: 0;
    z-index: 1100;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
}

.shooting-flying-bullet {
    position: absolute;
    left: 0;
    top: 0;
    width: 120px;
    filter: drop-shadow(0 5px 8px #382a2540);
}

.shooting-flying-bullet svg {
    display: block;
    width: 100%;
    height: auto;
}

.shooting-glass {
    position: absolute;
    inset: 0;
    background: #1621320d;
}

.shooting-glass > svg {
    display: block;
    width: 100%;
    height: 100%;
}

.shooting-impact {
    position: absolute;
    width: 28px;
    height: 24px;
    transform: translate(-50%, -50%);
    border-radius: 48%;
    background: radial-gradient(
        ellipse,
        #111821c9 0 20%,
        #b8d4df94 29%,
        #ffffffd9 40%,
        transparent 69%
    );
    box-shadow: 0 0 12px #f0fcff66;
}

.shooting-found-message {
    position: absolute;
    bottom: 12%;
    left: 50%;
    transform: translateX(-50%);
    padding: 11px 20px;
    border-radius: 999px;
    background: #302820ed;
    color: #fff;
    font: 600 16px/1.5 system-ui, sans-serif;
    white-space: nowrap;
}

.shooting-egg-announcement {
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
        announcement.className = "shooting-egg-announcement";
        announcement.setAttribute("role", "status");
        document.body.appendChild(announcement);

        var attached = new Map();
        var busy = false;
        var layer = null;
        var timers = [];
        var animations = [];

        var resizeObserver = typeof ResizeObserver === "function"
            ? new ResizeObserver(function () {
                attached.forEach(positionBullet);
            })
            : null;

        // 写真の大きさに合わせて銃弾を配置する。
        function positionBullet(button, image) {
            button.hidden = image.offsetHeight === 0;

            button.style.top = (
                image.offsetTop +
                Math.max(
                    0,
                    Math.min(
                        image.offsetHeight - 44,
                        image.offsetHeight * .72 - 22
                    )
                )
            ) + "px";
        }

        // カテゴリ変更・並べ替え後にも銃弾を付け直す。
        function attachBullets() {
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
                    !path.endsWith("/media/shooting.jpg") ||
                    attached.has(image)
                ) {
                    return;
                }

                var card = image.closest(".work-card");
                var button = document.createElement("button");

                button.type = "button";
                button.className = "shooting-hidden-bullet";
                button.setAttribute(
                    "aria-label",
                    "写真に隠れた銃弾の演出を再生する"
                );
                button.innerHTML = bulletSVG;
                button.disabled = busy;

                card.classList.add("shooting-egg-card");

                // 写真のリンクとは別のボタンにする。
                card.appendChild(button);
                attached.set(image, button);
                positionBullet(button, image);

                if (resizeObserver) {
                    resizeObserver.observe(image);
                }

                image.addEventListener("load", function () {
                    positionBullet(button, image);
                }, { once: true });

                button.addEventListener("click", function (event) {
                    event.preventDefault();
                    playShootingEffect(button);
                });
            });
        }

        function later(callback, delay) {
            timers.push(setTimeout(callback, delay));
        }

        function animate(node, frames, options) {
            if (typeof node.animate === "function") {
                animations.push(node.animate(frames, options));
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

        // 演出を終了して元の表示に戻す。
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

        // 中心から画面の端へ伸びる、不規則なひびを描く。
        function makeCracks(width, height, x, y) {
            var rays = [];
            var main = "";
            var details = "";
            var count = width <= 600 ? 10 : 13;

            function point(p) {
                return p.x.toFixed(1) + " " + p.y.toFixed(1);
            }

            for (var i = 0; i < count; i++) {
                var angle =
                    i / count * Math.PI * 2 +
                    (Math.random() - .5) * .22;

                var dx = Math.cos(angle);
                var dy = Math.sin(angle);

                var distance = Math.min(
                    Math.abs(dx) < .0001
                        ? Infinity
                        : (dx > 0 ? width - x : x) / Math.abs(dx),

                    Math.abs(dy) < .0001
                        ? Infinity
                        : (dy > 0 ? height - y : y) / Math.abs(dy)
                );

                var ray = [{ x: x, y: y }];

                [.07, .22, .46, .72, 1].forEach(function (fraction) {
                    var bend = fraction === 1
                        ? 0
                        : (Math.random() - .5) * 28;

                    ray.push({
                        x: x + dx * distance * fraction - dy * bend,
                        y: y + dy * distance * fraction + dx * bend
                    });
                });

                main += "M" + ray.map(point).join("L");

                var branch = ray[3];

                details += "M" + point(branch) + "l" +
                    (dx * distance * .13 - dy * 28).toFixed(1) + " " +
                    (dy * distance * .13 + dx * 28).toFixed(1);

                rays.push(ray);
            }

            // 放射状の線を横方向にも不規則につなぐ。
            rays.forEach(function (ray, index) {
                var next = rays[(index + 1) % rays.length];

                [1, 2, 3].forEach(function (level) {
                    if (Math.random() > .3) {
                        details +=
                            "M" + point(ray[level]) +
                            "L" + point(next[level]);
                    }
                });
            });

            return '<svg viewBox="0 0 ' + width + ' ' + height +
                '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
                '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="' + main + '" stroke="#182a3d8c" stroke-width="3.2"/>' +
                '<path d="' + main + '" stroke="#ffffffed" stroke-width="1.4"/>' +
                '<path d="' + details + '" stroke="#203b504d" stroke-width="2"/>' +
                '<path d="' + details + '" stroke="#f3fcffcf" stroke-width=".9"/>' +
                '</g></svg>';
        }

        function showCracks(width, height, x, y, reduced) {
            var glass = element(
                "shooting-glass",
                makeCracks(width, height, x, y)
            );

            var impact = element("shooting-impact");
            impact.style.left = x + "px";
            impact.style.top = y + "px";

            var message = element(
                "shooting-found-message",
                "隠れた銃弾を発見！"
            );

            announcement.textContent = "隠れた銃弾を発見！";

            if (reduced) {
                return;
            }

            animate(glass, [
                { opacity: 0 },
                { opacity: 1 }
            ], {
                duration: 100,
                fill: "forwards"
            });

            // 少し表示してから、ひびを薄くして消す。
            later(function () {
                [glass, impact, message].forEach(function (node) {
                    animate(node, [
                        { opacity: 1 },
                        { opacity: 0 }
                    ], {
                        duration: 650,
                        fill: "forwards"
                    });
                });
            }, 1300);
        }

        function playShootingEffect(button) {
            if (busy) {
                return;
            }

            busy = true;

            attached.forEach(function (bulletButton) {
                bulletButton.disabled = true;
            });

            var rect = button.getBoundingClientRect();
            var width = window.innerWidth;
            var height = window.innerHeight;
            var x = width * .52;
            var y = height * .46;
            var size = Math.min(120, width * .28);

            layer = document.createElement("div");
            layer.className = "shooting-crack-layer";
            layer.setAttribute("aria-hidden", "true");
            document.body.appendChild(layer);

            announcement.textContent = "";

            var reduced =
                window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
                typeof layer.animate !== "function";

            // 「動きを減らす」設定では、飛び出しを省略する。
            if (reduced) {
                later(function () {
                    showCracks(width, height, x, y, true);
                }, 20);

                later(finish, 1200);
                return;
            }

            var bullet = element("shooting-flying-bullet", bulletSVG);
            bullet.style.width = size + "px";

            var startX = rect.left + rect.width / 2 - size / 2;
            var startY = rect.top + rect.height / 2 - size * .2;

            // 写真から画面の手前へ、大きくなりながら飛ぶ。
            animate(bullet, [
                {
                    opacity: 1,
                    transform: "translate(" +
                        startX + "px," +
                        startY +
                        "px) scale(.28) rotate(-24deg)"
                },
                {
                    opacity: 1,
                    transform: "translate(" +
                        (x - size / 2) + "px," +
                        (y - size * .2) +
                        "px) scale(1.3) rotate(-38deg)",
                    offset: .65
                },
                {
                    opacity: 0,
                    transform: "translate(" +
                        (x - size / 2) + "px," +
                        (y - size * .2) +
                        "px) scale(5) rotate(-55deg)"
                }
            ], {
                duration: 470,
                fill: "forwards",
                easing: "cubic-bezier(.5,0,.9,.5)"
            });

            later(function () {
                showCracks(width, height, x, y, false);
            }, 450);

            later(finish, 2450);
        }

        new MutationObserver(attachBullets).observe(grid, {
            childList: true,
            subtree: true
        });

        window.addEventListener("resize", function () {
            attached.forEach(positionBullet);

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

        attachBullets();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            startShootingEgg,
            { once: true }
        );
    } else {
        startShootingEgg();
    }
})();