const credform = document.querySelector(".cred");
if (credform) {
    credform.addEventListener('submit', (event) => {
        if (!credform.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        credform.classList.add('was-validated');
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const loginform = document.getElementById("loginform");
    if (loginform) {
        loginform.addEventListener("submit", function (event) {
            if (!loginform.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            loginform.classList.add('was-validated');
        }, false);
    }
});



console.log("Page loaded. data-type:", document.querySelector("#allposts")?.getAttribute("data-type"));
let offset = 0;
const limit = 15;
let loading = false;
let postsInitialized = false; // Prevent double initialization

function loadPosts() {
    loading = true;
    document.querySelector("#loading").style.display = "block";
    const type = document.querySelector("#allposts").getAttribute("data-type");
    console.log("Calling loadPosts with type:", type);

    let url = `/load_posts?offset=${offset}&limit=${limit}&type=${type}`;
    let username;
    const followbtn = document.querySelector("#followbtn");
    if (followbtn) {
        username = followbtn.getAttribute("data-username");
    } else {
        username = document.querySelector("#nav") ? document.querySelector("#nav").getAttribute("data-username") : null;
    }

    if (type === "profile" && username) {
        url += `&username=${username}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            document.querySelector("#allposts").insertAdjacentHTML("beforeend", data.html);
            document.querySelector("#loading").style.display = "none";

            if (data.has_more) {
                offset += limit;
                loading = false;
            }
        })
        .catch(error => {
            document.querySelector("#loading").style.display = "none";
            console.error("Error loading posts:", error);
        });
}

function resetPosts() {
    offset = 0;
    document.querySelector("#allposts").innerHTML = "";
    loading = false;
    loadPosts();
}

document.addEventListener("DOMContentLoaded", () => {
    // Only initialize posts ONCE per page load
    if (!postsInitialized && document.querySelector("#allposts")) {
        postsInitialized = true;
        resetPosts();
    }

    if (document.querySelector("#allposts")) {
        window.onscroll = () => {
            if (!loading && window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
                loadPosts();
            }
        };
    }

    // Profile tabs toggle (Posts / Likes)
    const tabPosts = document.getElementById('tab-posts');
    const tabLikes = document.getElementById('tab-likes');
    const allposts = document.getElementById('allposts');
    function setActiveTab(tab) {
        if (!allposts) return;
        document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
        tab.classList.add('active');
        allposts.setAttribute('data-type', tab.getAttribute('data-tab'));
        resetPosts();
    }
    if (tabPosts && tabLikes) {
        tabPosts.addEventListener('click', () => setActiveTab(tabPosts));
        tabLikes.addEventListener('click', () => setActiveTab(tabLikes));
    }

    const form = document.querySelector("#newpost");
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            form.classList.add('was-validated');
            if (!form.checkValidity()) {
                return;
            }
            const formData = new FormData(form);
            try {
                const response = await fetch("/post/", {
                    method: "POST",
                    body: formData
                });
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
                const data = await response.json();
                form.querySelector("textarea").value = "";
                form.classList.remove('was-validated'); // Remove validation styling
                document.querySelector("#allposts").innerHTML = data.html;
                offset = limit; // Reset offset to next page after reload
            } catch (error) {
                console.error("Error submitting post:", error);
                alert("Error submitting post. Please try again.");
            }
        });
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    const csrftoken = getCookie('csrftoken');
    const allpostsEl = document.querySelector("#allposts");
    if (allpostsEl) allpostsEl.addEventListener("click", function (event) {
        const likebtn = event.target.closest(".likebtn");
        if (likebtn && likebtn.tagName === "BUTTON") {
            event.preventDefault();
            const post_id = likebtn.getAttribute("data-id");
            const likecount = likebtn.closest(".post").querySelector(".likecount");

            fetch(`/like/${post_id}/toggle_like`, {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrftoken,
                }
            })
                .then(response => response.json())
                .then(data => {
                    const likeicon = likebtn.querySelector(".likeicon");
                    if (data.liked) {
                        likeicon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="likeicon bi bi-heart-fill" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314" />
</svg>`;
                    } else {
                        likeicon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-heart" viewBox="0 0 16 16">
  <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143q.09.083.176.171a3 3 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15"/>
</svg>`;
                    }
                    likecount.innerText = data.like_count;
                });
        }

        // Handle per-post dropdown actions
        const hideItem = event.target.closest('.post-action-hide');
        if (hideItem) {
            event.preventDefault();
            const post = hideItem.closest('.post');
            const postId = post.getAttribute('data-post-id');
            fetch(`/post/${postId}/hide`, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrftoken }
            }).then(res => res.json())
              .then(() => { post.remove(); })
              .catch(() => alert('Failed to hide post.'));
            return;
        }

        const deleteItem = event.target.closest('.post-action-delete');
        if (deleteItem) {
            event.preventDefault();
            const post = deleteItem.closest('.post');
            const postId = post.getAttribute('data-post-id');
            if (!confirm('Delete this post permanently?')) return;
            fetch(`/post/${postId}/delete`, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrftoken }
            }).then(res => res.json())
              .then(() => { post.remove(); })
              .catch(() => alert('Failed to delete post.'));
            return;
        }

        const followItem = event.target.closest('.post-action-follow');
        if (followItem) {
            event.preventDefault();
            const post = followItem.closest('.post');
            const username = post.querySelector('.card-header a').textContent.trim().replace(/^@/, '');
            fetch(`/profile/${username}/toggle_follow`, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrftoken }
            }).then(res => res.json())
              .then((data) => {
                  // Toggle to unfollow immediately
                  followItem.classList.remove('post-action-follow');
                  followItem.classList.add('post-action-unfollow');
                  followItem.textContent = 'Unfollow';
              })
              .catch(() => alert('Failed to follow user.'));
            return;
        }

        const unfollowItem = event.target.closest('.post-action-unfollow');
        if (unfollowItem) {
            event.preventDefault();
            const post = unfollowItem.closest('.post');
            const username = post.querySelector('.card-header a').textContent.trim().replace(/^@/, '');
            fetch(`/profile/${username}/toggle_follow`, {
                method: 'POST',
                headers: { 'X-CSRFToken': csrftoken }
            }).then(res => res.json())
              .then((data) => {
                  // Toggle to follow immediately
                  unfollowItem.classList.remove('post-action-unfollow');
                  unfollowItem.classList.add('post-action-follow');
                  unfollowItem.textContent = 'Follow';
              })
              .catch(() => alert('Failed to unfollow user.'));
            return;
        }
    });

    // Update Feeds button text based on selection and current page
    const feedsButton = document.getElementById('feedsDropdown');
    const feedsMenu = document.querySelector('[aria-labelledby="feedsDropdown"]');
    function setFeedsButtonText(text) {
        if (feedsButton && text) feedsButton.textContent = text;
    }
    function inferFeedFromUrl() {
        const path = window.location.pathname;
        if (path.includes('/following')) return 'Following';
        if (path.includes('/allposts') || path === '/' || path === '/index' || path === '/network/' ) return 'Recents';
        if (path.includes('/profile')) {
            const userEl = document.querySelector('#nav[data-username]');
            return userEl ? userEl.textContent.trim() : 'Profile';
        }
        return 'Feeds';
    }
    if (feedsButton) {
        setFeedsButtonText(inferFeedFromUrl());
    }
    if (feedsMenu && feedsButton) {
        feedsMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            const text = item.textContent.trim();
            setFeedsButtonText(text);
        });
    }

    // While Feeds dropdown is open, disable pointer events on textarea underneath
    const feedsDropdownWrapper = document.querySelector('.feeds-center');
    if (feedsDropdownWrapper) {
        $(feedsDropdownWrapper).on('show.bs.dropdown', function () {
            document.body.classList.add('dropdown-open');
        });
        $(feedsDropdownWrapper).on('hide.bs.dropdown', function () {
            document.body.classList.remove('dropdown-open');
        });
    }

    const followbtn = document.querySelector("#followbtn");
if (followbtn) {
    // Set initial button class based on text/content
    if (followbtn.innerText.trim() === "Following") {
        followbtn.classList.remove("btn-primary");
        followbtn.classList.add("btn-secondary");
    } else {
        followbtn.classList.remove("btn-secondary");
        followbtn.classList.add("btn-primary");
    }

    followbtn.addEventListener("click", (event) => {
        event.preventDefault();
        const username = followbtn.getAttribute("data-username");
        fetch(`/profile/${username}/toggle_follow`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrftoken,
                "Content-Type": "application/json"
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.is_following) {
                    followbtn.innerText = "Following";
                    followbtn.classList.remove("btn-primary");
                    followbtn.classList.add("btn-secondary");
                } else {
                    followbtn.innerText = "Follow";
                    followbtn.classList.remove("btn-secondary");
                    followbtn.classList.add("btn-primary");
                }
                document.querySelector("#followercount").innerText = data.followers_count;
                document.querySelector("#followingcount").innerText = data.following_count;
            });
    });
}
        });
