document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const mainNav = document.getElementById("navLinks");
    const navLinks = document.querySelectorAll(".nav-link");
    const currentYear = document.getElementById("currentYear");

    // Mobile navigation
    if (menuToggle && mainNav) {
        menuToggle.addEventListener("click", () => {
            const isOpen = mainNav.classList.toggle("open");
            menuToggle.classList.toggle("active", isOpen);
            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation menu");
        });

        mainNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => closeMenu());
        });

        document.addEventListener("click", event => {
            if (!mainNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 850) closeMenu();
        });
    }

    function closeMenu() {
        if (!mainNav || !menuToggle) return;
        mainNav.classList.remove("open");
        menuToggle.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation menu");
    }

    // Active navigation link
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.forEach(item => item.classList.remove("active"));
            link.classList.add("active");
        });
    });

    // Automatic copyright year
    if (currentYear) currentYear.textContent = new Date().getFullYear();

    // Learner search and level filters
    const track = document.getElementById("learnerTrack");
    const searchInput = document.getElementById("learnerSearch");
    const filterButtons = document.querySelectorAll("[data-level-filter]");
    const emptyMessage = document.getElementById("learnerEmpty");
    const learnerCards = track ? Array.from(track.querySelectorAll(".learner-card")) : [];
    let selectedLevel = "all";

    function filterLearners() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        let visibleCount = 0;

        learnerCards.forEach(card => {
            const level = card.dataset.level || "";
            const searchableText = `${card.dataset.search || ""} ${card.textContent}`.toLowerCase();
            const matchesLevel = selectedLevel === "all" || level === selectedLevel;
            const matchesSearch = !query || searchableText.includes(query);
            const visible = matchesLevel && matchesSearch;

            card.hidden = !visible;
            if (visible) visibleCount++;
        });

        if (emptyMessage) emptyMessage.hidden = visibleCount !== 0;
        updateCarousel();
    }

    if (searchInput) searchInput.addEventListener("input", filterLearners);

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectedLevel = button.dataset.levelFilter || "all";
            filterButtons.forEach(item => {
                const active = item === button;
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });
            filterLearners();
        });
    });

    // Expandable learning-focus panels
    if (track) {
        track.addEventListener("click", event => {
            const trigger = event.target.closest(".learner-expand");
            if (!trigger) return;

            const card = trigger.closest(".learner-card");
            const panel = card ? card.querySelector(".learner-extra") : null;
            if (!card || !panel) return;

            const isExpanded = trigger.getAttribute("aria-expanded") === "true";
            trigger.setAttribute("aria-expanded", String(!isExpanded));
            panel.hidden = isExpanded;
            trigger.innerHTML = isExpanded
                ? 'View learning focus <span>＋</span>'
                : 'Hide learning focus <span>−</span>';
            card.classList.toggle("expanded", !isExpanded);
        });
    }

    // Horizontal carousel controls; desktop grid remains fully visible.
    const previousButton = document.getElementById("learnerPrev");
    const nextButton = document.getElementById("learnerNext");

    function scrollLearners(direction) {
        if (!track) return;
        const firstVisible = learnerCards.find(card => !card.hidden);
        const amount = firstVisible ? firstVisible.getBoundingClientRect().width + 18 : 300;
        track.scrollBy({
            left: direction * amount,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        });
    }

    if (previousButton) previousButton.addEventListener("click", () => scrollLearners(-1));
    if (nextButton) nextButton.addEventListener("click", () => scrollLearners(1));

    function updateCarousel() {
        if (!track) return;
        const mobileCarousel = window.matchMedia("(max-width: 850px)").matches;
        if (previousButton) previousButton.disabled = !mobileCarousel;
        if (nextButton) nextButton.disabled = !mobileCarousel;
    }

    window.addEventListener("resize", updateCarousel);
    updateCarousel();
    filterLearners();
});