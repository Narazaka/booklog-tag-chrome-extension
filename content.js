// @ts-check

/**
 * @typedef BookData
 * @property {string} id
 * @property {string} service_id
 * @property {string[]} tags
 */

/**
 *
 * @param {number} ms
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    await wait(100);
    const $showTagsModal = /** @type {HTMLAnchorElement} */(document.querySelector(".show-tags-modal"));
    $showTagsModal.click();
    await wait(10);
    const $ids = /** @type {HTMLUListElement} */(document.querySelector("#tags"));
    const tags = Array.from($ids.querySelectorAll(".tag .txt")).map($tag => $tag.textContent);

    const $modalClose = /** @type {HTMLAnchorElement} */(document.querySelector(".modal-close"));
    $modalClose.click();

    const $tagsButton = makeTagsButton();
    document.querySelector(".shelf-header-menu").insertBefore($tagsButton, document.querySelector(".shelf-header-menu-tags-modal"));
    const $addTagsBox = makeAddTagsBox();
    document.querySelector(".shelf-header-menu").insertBefore($addTagsBox, document.querySelector(".shelf-header-menu-tags-modal"));

    const makeTagButtons = genMakeTagButtons(tags);

    while (true) {
        const $itemWrappers = /** @type {NodeListOf<HTMLDivElement>} */(document.querySelectorAll(".item-wrapper"));
        for (const $itemWrapper of $itemWrappers) {
            if ($itemWrapper.dataset.injected) continue;
            makeTagButtons($itemWrapper);
        }
        await wait(2000);
    }
}

function makeTagsButton() {
    const $li = document.createElement("li");
    $li.className = "shelf-header-menu-category-modal";
    const $button = document.createElement("button");
    $button.textContent = "タグ";
    $li.appendChild($button);

    $button.addEventListener("click", () => {
        const show = $button.dataset.show === "show";
        const $tagButtonsList = /** @type {NodeListOf<HTMLDivElement>} */(document.querySelectorAll(".tag-buttons"));
        for (const $tagButtons of $tagButtonsList) {
            $tagButtons.hidden = !show;
        }
        $button.dataset.show = show ? "" : "show";
    });

    return $li;
}

const addTag = "譲渡・売却";

function makeAddTagsBox() {
    const $li = document.createElement("li");
    $li.className = "shelf-header-menu-category-modal";
    const $input = document.createElement("input");
    $input.placeholder = addTag;
    const $disp = document.createElement("span");
    $li.appendChild($input);
    $li.appendChild($disp);

    $input.addEventListener("keypress", async (event) => {
        if (event.keyCode !== 13) return;

        const keyword = $input.value;
        if (!keyword) {
            beepNg();
            return;
        }

        $input.disabled = true;
        const books = await searchBooks(keyword);
        for (let i = 0; i < books.length; ++i) {
            $disp.textContent = `${i + 1} / ${books.length}`;
            const book = books[i];
            if (book.tags.includes(addTag)) continue;
            book.tags.push(addTag);
            await setTags(book);
        }
        $disp.textContent = "";
        $input.value = "";
        $input.disabled = false;
        $input.focus();
        if (books.length) {
            beepOk();
        } else {
            beepNg();
        }
    });

    return $li;
}

/**
 *
 * @param {string[]} allTags
 */
function genMakeTagButtons(allTags) {
    /**
     *
     * @param {HTMLDivElement} $wrapper
     */
    function makeTagButtons($wrapper) {
        if ($wrapper.dataset.injected) return;
        if (!$wrapper.dataset.book) return;

        const book = /** @type {BookData} */(JSON.parse($wrapper.dataset.book));
        const $tagButtons = document.createElement("div");
        $tagButtons.className = "tag-buttons";
        for (const tag of allTags) {
            const hasTag = book.tags.includes(tag);
            const $button = document.createElement("button");
            $button.textContent = tag;
            $button.style.margin = "1px";
            $button.style.border = "1px solid black";
            $button.style.color = "black";
            $button.style.background = hasTag ? "red" : "white";
            $button.style.fontSize = "smaller";
            $button.addEventListener("click", genToggleTag($wrapper, $button, tag));
            $tagButtons.appendChild($button);
        }
        $wrapper.appendChild($tagButtons);
        $wrapper.dataset.injected = "true";
    }
    return makeTagButtons;
}

/**
 *
     * @param {HTMLDivElement} $wrapper
 * @param {HTMLButtonElement} $button
 * @param {string} tag
 */
function genToggleTag($wrapper, $button, tag) {
    return async function onClick() {
        const book = /** @type {BookData} */(JSON.parse($wrapper.dataset.book));

        const hasTag = book.tags.includes(tag);
        if (hasTag) {
            book.tags.splice(book.tags.indexOf(tag), 1);
        } else {
            book.tags.push(tag);
        }
        const res = await setTags(book);
        if (res.ok) {
            $button.style.background = !hasTag ? "red" : "white";
            $wrapper.dataset.book = JSON.stringify(book);
        } else {
            alert(await res.text());
        }
    };
}

/**
 *
 * @param {BookData} book
 */
function setTags(book) {
    const body = new URLSearchParams({
        id: book.id,
        service_id: book.service_id,
        tags: book.tags.join(" "),
    });
    return fetch("https://booklog.jp/api/book/tag", {
        method: "POST",
        credentials: "include",
        body,
    });
}

/**
 *
 * @param {string} keyword
 */
async function searchBooks(keyword) {
    const url = new URL("https://booklog.jp/users/narazaka/all");
    url.searchParams.set("json", "true");
    url.searchParams.set("sort", "sort_desc");
    url.searchParams.set("keyword", encodeURIComponent(keyword));
    let page = 1;
    /** @type {BookData[]} */
    const books = [];
    while (true) {
        url.searchParams.set("page", page.toString());
        const res = await fetch(url.toString());
        if (!res.ok) {
            alert(await res.text());
            return;
        }
        const data = await res.json();
        if (!data.books.length) break;
        books.push(...data.books);
        ++page;
    }
    return books;
}

function beepOk() {
    new Audio("data:audio/mp3;base64,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5xq2Pf//W/jFsxZbg/lg97WUpXn7S4xZRTIIPWkKoCpkFoKmL7xtwqUXc1lYhyKgH8lzxOhsVKbhRjkT47VmO5qSsNWJ6E8aWVVNqtiZjs8FcPLJ3u6v6LaEvf3HEOBNeSlWB3ajdd8qcssBUvPBbJrRfXTuDi8TEF/Hfwr1syRJ2P4g2ra2MxqbexZ7xKTalnzNaWSNDl8fOdbpfXxT5gQq0hW3EpCgz48+8R8Yfa+b2znE94PjfNvmm16H4tdtt4mby3nxalaYvDtjP/pFzqDvNMxoP8OHebUO+3v8b//FtWhWvEveLBxSuPmPX23CMmwNasq2f83+A3H2tl/nwciAR3X+XBHAP8v80SDMDDCqF1avP/zEgNVJWsADtataq//+YWRGSlRn6sBA1ByrzL8f//8wcWMIFS3piBqYCHCwFWrX6uPP///4QYISmVDKZoVDDGRQVEcvy3v8f////RWUpEJEYYPg4VAAuYKMCQ0DAfGzNVr9Xf7//////d6DEEzygUIDA6Xw4AR4wghMcDceZa7jvGtl3///////MAAxGBDQUYgcgUCa+vAABJIEGIhGT1lyW6gAD3/atXlbLuP71///////////rcTuMLDCIDBoAxNigADxYAMBAFMXBMAFXjMABVQOgYKHDwO5SdphgvBKmrVP/8tdq4ov5jMUSzdy8ylEMXB4Zqf5pkSYqTUMp/xITMcObHf8KCZkRXvn+ZQMmNJZrjPNVs//zXkMxRDNgf/7skSigAikdrOGa2ADG45WIM3sAAAAAaQcAAAAAAA0g4AAAPTiImard5//6HUzBfOEpzFy4wkT/KZpbn//+alGmRpBnY0DDkw8sMxLo7KalDVw////MhEFbRUIMjPjEC0yINC5V38a1bc1////5iBeZcUkQ4FAcw4VMSEQqBIDkXa2esu446q//////mAihjI4YyFITjDR4yswLmkAMZCbGACY8I44bx5/71lv///////MFHgAIgoVQ+QmoKxSZh3DKIv7TMx1l+v////////////////8s6tJlZgQiDQgWBgQKgESMTBkOYNCjDwot89SAYEghe1AKxBASYEFmGBL7DACYgP8XWdF8RCwdgVHT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HTw==").play();
}

function beepNg() {
    new Audio("data:audio/mp3;base64,//u0ZAAABQqCT05SYAIAAA0gwAAAFBlrXv2XgAAAADSDgAAAAAEAIEIMEMAA2gd4CB8/fYDihQNsU7BCHAUH7QNSgOVu2ApgAqhDPeHqAe2gFD+/YQeGAwCQhY+DbT+zcPURACADbQT4F9/+/h+AX0A5tAzhEbg2zBtf/tZuGCwAmDBGbBswDbAQYHyf//4fAJwC5siRBAtHD5x3m5N////5EwxILgKhFBzCIE+6BByLlf//////////8uIplxB0gekMH6/gAAAAArBUvUpLKmFif6TO3RdlwgoO21y1osEqiiTxqBlBopVdORdglLeywWUTJGvYrcW0m0batUo248PEAmm4UV+cCu3mdXnhj6bzLm3SMTt7q1S6T0iwj4b5t9fSEKNWKe0el8naqt4qvJWvtRK7x8Lb2beH7jj5knznWIFt7zA3/5ce1pYVvrEHOv3tc1/r8/2+9eNFrb0jWx8RvJPYGgBpI1JVPgwgnACMRBVeVJiYRJ0zQyRp4YATb2JbBZYiVtpceP+J1uBLuS8QRuPLpLFgsERJRWtKiqGJDSPKpAQQnvCmtCER7amGCHqBK5+UYEgr2fTAXMMT7QhRtRbQgSCbgwZlKB5eZiKwIa/xGoI409ufJ4xavXp2Sxa72Yjrdan7je9pi3+OjKb/a5/8wM/+Vn//f7/8ff/hz//v//mTUvkM5S6zdX8qh5mSc4WYDcokuYl29DWTDmWV003HAZeDgU9aaySmBZXLsbiHUxBiXyHOwYZM331Y//u0ZG0O9UdVVIuZe3AAAA0gAAAAE4VVUA3prcAAADSAAAAALGTSrp/9EAsvxY7WqgABv/qjgd7b9rZKHVbz9vU6hq8ZgmpQTY6CjGxqgmxIH6gwBSKqNwzDk0gzFBzCcBybDuAzz+YAX6TzgPBTWuIMJXx/En5gKj8XD/J5zrJJ+O1Pk1DnUvMWlXe6j+mAAA00Zk7VgEGjoIJKwirTI4aKhck+Nt2DEwBZxD9uGB0ETX57mb+GWJyPf3ghOuC3hJyoMe61+aSosFw716Fsznf7Vz7ezVtpef70UN1JBgs3RdMG6A2OPgNoW6AkQp6WYA4J2oshLTqWPkNJaoU8QGN84Hqc4I6MEFReDi1mgwj+cHLPqrLxhyizckOolD/Ub86l5/zj5XdL7a////////////////////////////////////////////////////////////////////////////////////////////////0dPR09HT0dPVVeF4iQBlgMEE1MFYwqiEKgxbKHEya3UmXtkStpncKEfql8y0QAgoPMoPpK6NxpJVAD7N5BZnhS7eGS6waOL/wx0OCZdOLWZY1oxMBU/IKzwmDj6Z9PKJgQDwcL6zmCwEGWAkhy2p0dAzQ3qxjIQuUQ9p9lwxc2plg+YfdLrP2icaHKaq+ZpEO1OwVDIXDIobWNpI0OohHdtGMk+X71ShU17K1zEdCST/9qJIqSPvyQvY82uTKTri/+mNtNx/6jv9/67G4p//u0ZNiG92pXVCuag3AAAA0gAAAAHBmJQg5vLcAAADSAAAAAz/bJl/8js5z/5DnP/5vD/+h5//rv//6//+59bpKkizmIHmGgXHOwlhxCF11hF3GMAyEwDSV9lZzCp0CALYKVlwySmUgjE5+URkwYJa25WTxBg+i1RSuVLZFh+MUMuS1MWBLvbiioNIGoO/byDCEoC33bvTEA4UB0XzmG/AxTZyvKPA7fJTY6CJu7SRiyVCqW0luCEOJXV9bfbxyQ2/OQIDVJ453IcHKlCKlinUSEsvZh2OFuLn5wGkK/9Pjih0c+f/CVpM91unVvw391rMu5/vW9v/hXfq3/4uhd//gqk//uxTn/9L3/+xv/+73fK4er////////////////////////////////////////////////////////////////////////////////////////////////R09HT0dPR09HT0dPVQAAaMuJBEQmssZhfEejwg5bBIAXEfQ08HR1EgdNR0zIVHjlBHUFQQuePGI6r2jTsg1ZH9TlOVS8xImkMtTDexchFcmnmsA/gLNS8f1szWTATU80lT70CFROJeadcACNJrVO8ERQFuXI4PiclFQNowByGJEtmTwZKLozNOhrj9P2o+mBOUDSG4EIVduVOwWSndSGH0fwhLCJRUToWAfdwJXC26KzuJIIw3RLR1ok/jiLIh6ITc82W/QTEUijXJ2WRuOOBakFfKIwzF60og6E4VK9t/5RYpLG//u0ZP+H+T9aUYO7w3AAAA0gAAAAHoVnSK3nDcgAADSAAAAAp3PdecncMM8p6vbsYVv7+64YIXD2zPjh4783jwCAAAmAhgqGmaCpyy4eyZnImSfY4iAZBcsBCI0UkRvD6+SAoVC9agBFxNmhUNKllSy1DEIw0OZbqF2Mdp46GTS2ViZSKkY5QSoOO7kbYSDTSGESdAe4LwNHXdE3/bMmu1uN3Emp+lcha6tuS2mOxuOqaKfzmXwX7CIwqRx21rqZNB6w4upF6SeVNIZRSJbstxxWc8kyuZbcgnZ5ccgfhsDwxP9NDvTEBRmdr12+3dj0O7zm5BLKaVQLS14/Raxl16l5K52phTWcdUM7+7NnHVDjrGHa2Oo7Z18tyyuXbNn6XX7u2ToSWxZ1edRzBIpKbsYWL525pGAkcbkT5nsvmACsZAF5hAZBVGGMywYnBgwIRYZCy2HQWYCChqyFrhzMAsgTYG6mgCaJIq6bw43MIJBYBHYExpikWBGoKJF7CZklcNMJcRoBELqfoKGGlBU1CgEjqFg4cCDCqxfciASMLkQ0RDmGAimmQWqZAl2RAFqRwYcJTITCHQSQZPZV5aVGotyWpVKWtacUJogoEVMVJrGgNnxCEgRjS/mmrsL+s0LvMxbs97/I7NLUJStbhEH6atFl3J8qcuu6CdafcHwbDVPGZudq0tI3V05a98NQ/UgSJRBgEGw61xebgzjvtHbFTX8M+b3rDmeeen4jsrxk9aV2KKaudlcy9ElityDYjUzm//u0ZP+AB1Rf1K1vAAQAAA0goAAAJ/IFThnMgAgAADSDAAAAZreGHO591v////////////////713PP8O6////////////////+zWu3DZGBA0AMNEhnsFlJfqwxQFAptL7ICgKWDRK7sAiMdivIaEniRWssxAVWPT0EDC5+zBpkYw53mtBD3+jV9H6xTQUrPDMPLSUDltm6xSvk2JWGZkq+XKmsnqlmHYcb6VWpE7tNDT7Xr+1O7VmstPHeLsU2UrbNh91p3MutJossmV54wCsTWMtX5/yVi2sIBdrLKAn/x5Nvf+qZ5d4wTD2NWDcP3EJ/LG9PaylVnfyTv/XvY/e5zVnn7y7++f+rUTHiFtvbFKv///////////////////////////////////////////////////////////////////////////////////////////////0dPR09HT6q7bCuYwLuwwSCwmAODDBUyxpJR0CnZMJQvJjxXVEzFksSZ29WyYdLoB4qiEYW+NGmE0TEkhWKcnjPyurg0cHHkawqGPAstgnEy0QcefZ8YWBReslIwtsELJQiWSd2UlXLjWBICNj345SJS2iJFyekf1BPB0umgIZZ+FtXCbNNmAnK0VnRNak8NSUzXe/jRwDh+sJkG4qV3gGYyzAVEBQ01ZI0SpZnU7R6M76qQ1K/7cUWvoayfOrrWVn15lROH+XUtoc7cVSllm6m/F5d1ecj7plFXlVl+HONDpf09lr6j//u0ZPiP+JNZVQdvAAAAAA0g4AAAH3WtRA7vDcAAADSAAAAAy2vqw9V5dmt/QZ8+h7Z/dn/1Pd/l//y1/1Mf+rzVOxgG8g0sBh4HvCSrcFA1+lQjp/CBDWiRiYE09RyjYgIop2AQKmPAxKFkU7FaaDQiSF8mGTRbGDA4btRjLXbPart2/UaoM55J5qH+sGv6/5YEURNlBIwqmYE0jfmoNIleSgQQME0wlInnJUCkS7cIIjtlMAlBWWRoBAU1jOA3NG9MwLOK6yHhRRXULUDkGiTAsRCOsHDx9hwbLNQ8DyWFSWmQQYVZTG9kHIjTHMJ5aJBFZE9ZBE6iIIVETP0ifTpk4hRNM4b51PWe1G71PnZf///////////////////////////////////////////////////////////////////////////////////////////////9HT0dPR09X7dNNAwpqI3CBAeC5RUwQScx5A0LgajaYPFCCiDeRnxgscYIAOu8BlLsLBF1uJhRar/NpRkBTrNsgsLSrl0qgcHSxhZa+rTRAyYAnLjIDHgaQbYEZOCuNGkERjIDIrgyLg4YxulUcUcs1hyh2e3RA6oVK5kRKlA05gDjkWKeMlp3NtwQZTkPcg4ggubY2YDt/Bn5thQ5YbkTn0tx/A0DOsQCmkFnQraQLrS4YISR1komNHd+MlBfPZ+ljvJHZTmhyHAot91DrK8Lqf8L/Fh0m/bzUX5MktfpndN/u3d5MwRa//u0ZP+P+PJm0oOZm3AAAA0gAAAAH7mlQg7vLcAAADSAAAAA+rDVrcxIcf1B3/2R3/uz9/7tn/j2Pfuf/zPf+r11G4JAmPZYPsgSAkcMNEkOf5KBVemDAQTHPF4QdGNaVXhANpMTAk0MAMW4/Jd5qfI+mM9vZINAQ7fpAiTW4KMsm1iksQi29KpgIavSMLFsu7TtJob3kAyrUTAELBoO4pEPuU0AbkCTsdBBMm1OCSRJ2MALTFQSJoBLx5SG6AlzxqgKdKKBZAlQ1iRB7JssdAWkoLF4Dlls2EZCAbw74yTLMw3rHWIa8P8PS1CmHqhzSTqGoli/TnBlU6x7asgnI5dRBeSOgb5kvWfas+1bZypynq////////////////////////////////////////////////////////////////////////////////////////////////VVYKxcxQSzD7bO+HEcAAiBRgFQG1wwVAmoMY7OBjsEQoqAEzW81QuHImDqCtqENKOgl/R5ZwcUX9popkFq/ewYbEdDWZYAAp3eqJviFM69COADYkFaqwwDB21K1tRQmkFS7VhDis5QCq5GnVVcxQTfgILAEU0G3DLsSuzhpIUoKpJWM2FC1hZZjTvzizg1AJ7BJ0yoWo08Fh6UqtyoKJ01l+zbIt1SqYNPyLjXwEFT6TsDps8EZVaMZuDFRY6RtTxtYIFTWq0PtQ7JE/HO3kl9e7HIYkXJheU98dabj9h3+7oWs1u8//u0ZP+P+Nhi0gOZm3AAAA0gAAAAICGbPA5rLcgAADSAAAAAe7/mqf/vv1vKYkX/Q8/90eP3Z3/uc/92e/QP47CUJuMhNapzJxMefxwAAsQCp5lLJSEdV9fjgUCnnSYg8zOJDxmUCdiwONZxmhAhzsHrBZYfuwElxlk7IHy9kcoIdvZqKDRZXEWYzOqyLjm7qCMzmcul9FQ27gNQqLGlUoY5frgmzUqsZRshy22MZc99JB8rhOLxodpFgvFNWX0rVUjpPgvFCmdwcdh0/6brZrPGtsus+naxXvIQ/W6zM4T9yYotVn/iv3ICpt1Yne7JIe/6aN8+5D3PpqTn1It38tf/Kbv42Mt4z3/S3v3rv/VcqsNqrp////////////////////////////////////////////////////////////////////////////////////////////////R09HT1VpwJAAudGazh8JWY6hBhQabSGRjCPBj40YkYDwvxEIwVAEht4UtTolZY8uxU1cNwOEMAVxZGsgxwaKnZg78YZsSBIVy6HCEhDNznYIUm7vdeKpyr2vumVAnHwoF1M1tyxr6LFikLtlBjdoZZarrUqBJKLNZYEtiyiLsYIVWzT4iHMYdqDvppmQDDt8RHmcW3tM0ooa3WCxYCRs0yMxfvKqDCR4HVtVJiNeuIgWzTsbfZTi48TDol9O7by4UDbyHKmf+780/8JxjUv7yJQTRbhn8/ppbZ+vznbUV/5LS///u0ZP+P+QxgzwN4w3AAAA0gAAAAH1GtLhW8gAAAADSCgAAA9u9/zMtxq1+c1Zw/dJa/LHn7u8/LHnP///H/+7wEisxG0zAYHODEgsAQxeQAsmTHRiMGiwyOUAEWlMyzhi0DmGAGYjChhAHgoCmfkAAQIExpQ4t8GJAa4RGFtygRhObkv0FxgCAa4AqO2BM5QGMzALmNnQgOQjLxrsFG0KFDwhJ02wtkZC6q4xwYMpMwUGHPSyQqoPItcYLtwoZCpMVhqaBAUChOGQRh+AVVHAHgmEIuo6+090lAm4vJD9uyXAWaoiCgmHPolK9YhCZcyNvWQ1UtWbRmal85NStydiANyF4qMTbut89tpn6+k7oU5LiV3KjUtbDS3IlLqPsBRbKmbHRzr+QDTu9SSi7nK7LR8qeGtSvGnuZ7q5X93vuW72Ov/Lt+Q0VDe/P+/////////////////eBRwZ//gkDKf/////////////////////////////////////////////////////60af5/r7oo8gAYCK55e0sigrCHCa9RwyhyuZrsMVTDeDVIS3M0pynTEL8LcaLpuTyHMy5G6IatE9DUhqSWsgwgEoAiLCbw9S0fpOUabwmypN4W4XIhSqXJBRbTqu9i+2WFW3YWXT5munTRcmFDVa9o+TyimYldGy91CV2mJXM0bda1ta1t+ta2xZ8+jQU6dMZhVrLFxCjWrX/+r17ur2LrEJ8+1CfWzWvx/a1t/////Na/Nf/6//u0ZP+ACk5wSQZzIAAAAA0gwAAAGkmg/B2HgAgAADSDgAAA1//tvNXtoorIKYCnxRcUVwKcFPii4orIKYCnxQb///////////////////////////////////////////////////////////////////////////////////////////////9HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09V//u0RP+P//8AaQAAAAAcIA0gAAAAAAABpAAAAAAAADSAAAAAVf////////////////////////////////////9HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR09HT0dPR0+q").play();
}

main();
