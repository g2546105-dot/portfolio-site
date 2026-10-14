// CSVの年・月を確認する（月は1〜12）
function getWorkDate(work) {
    var year = Number(work.year);
    var month = Number(work.month);
    return {
        year: Number.isInteger(year) && year > 0 ? year : null,
        month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : null
    };
}

// 年を比較してから、同じ年の写真を月で比較する
function compareWorkDates(a, b, sortType) {
    var dateA = getWorkDate(a);
    var dateB = getWorkDate(b);
    var direction = sortType === "old" ? 1 : -1;

    // 年が未登録の写真は最後に表示する
    if (dateA.year === null || dateB.year === null) {
        if (dateA.year === dateB.year) return 0;
        return dateA.year === null ? 1 : -1;
    }
    if (dateA.year !== dateB.year) {
        return direction * (dateA.year - dateB.year);
    }

    // 月が未登録の写真は、その年の最後に表示する
    if (dateA.month === null || dateB.month === null) {
        if (dateA.month === dateB.month) return 0;
        return dateA.month === null ? 1 : -1;
    }
    return direction * (dateA.month - dateB.month);
}

// カードに「2026年10月」のように表示する
function formatWorkDate(work) {
    var date = getWorkDate(work);
    if (date.year === null) return "年月未登録";
    return date.year + "年" +
        (date.month === null ? "（月未登録）" : date.month + "月");
}

fetch("./works.csv", { cache: "no-store" })
    .then(function(response) {
        if (!response.ok) {
            throw new Error("works.csvを読み込めませんでした: " + response.status);
        }
        return response.text();
    })
    .then(function(data) {
        // CSVを読み込む（現在のCSVはカンマを含まない形式）
        var rows = data.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
        var headers = rows.shift().split(",").map(function(header) {
            return header.trim();
        });

        var works = rows.filter(function(row) {
            return row.trim() !== "";
        }).map(function(row) {
            var values = row.split(",");
            var work = {};
            headers.forEach(function(header, index) {
                work[header] = (values[index] || "").trim();
            });
            return work;
        });

        var grid = document.getElementById("works-grid");
        var categorySelect = document.getElementById("category");
        var sortSelect = document.getElementById("sort");

        if (!grid || !categorySelect || !sortSelect) {
            throw new Error("WorksのHTML要素が見つかりません");
        }

        // カテゴリーの選択肢を初期化
        categorySelect.innerHTML = '<option value="all">すべてのカテゴリ</option>';
        var categories = [];
        works.forEach(function(work) {
            if (work.category && !categories.includes(work.category)) {
                categories.push(work.category);
            }
        });

        if (!categories.includes("バイト")) {
            categories.push("バイト");
        }

        categories.forEach(function(category) {
            var option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        function displayWorks() {
            var selectedCategory = categorySelect.value;
            var sortType = sortSelect.value;

            // 前のカードとComing Soonを消す
            grid.replaceChildren();

            var filteredWorks = works.filter(function(work) {
                return selectedCategory === "all" || work.category === selectedCategory;
            });

            if (sortType === "new") {
                filteredWorks.sort(function(a, b) {
                    return compareWorkDates(a, b, "new");
                });
            } else if (sortType === "old") {
                filteredWorks.sort(function(a, b) {
                    return compareWorkDates(a, b, "old");
                });
            } else if (sortType === "title") {
                filteredWorks.sort(function(a, b) {
                    return a.title.localeCompare(b.title, "ja");
                });
            }

            // 選択されたカテゴリーにまだ作品がない場合
            if (filteredWorks.length === 0) {
                var empty = document.createElement("p");
                empty.className = "coming-soon";
                empty.textContent = "Coming Soon - 写真は後日追加予定です。";
                grid.appendChild(empty);
                return;
            }

            filteredWorks.forEach(function(work) {
                var card = document.createElement("article");
                card.className = "work-card";

                var link = document.createElement("a");
                link.href = work.link || "#";

                var img = document.createElement("img");
                img.src = work.image;
                img.alt = work.title;

                var info = document.createElement("div");
                info.className = "work-info";

                var category = document.createElement("p");
                category.className = "work-category";
                category.textContent = work.category;

                var title = document.createElement("h4");
                title.textContent = work.title;

                var description = document.createElement("p");
                description.textContent = work.description;

                var year = document.createElement("p");
                year.className = "work-year";
                year.textContent = formatWorkDate(work);

                info.append(category, title, description, year);
                link.append(img, info);
                card.appendChild(link);
                grid.appendChild(card);
            });
        }

        displayWorks();
        categorySelect.addEventListener("change", displayWorks);
        sortSelect.addEventListener("change", displayWorks);
    })
    .catch(function(error) {
        console.error("Worksの読み込みエラー:", error);
    });