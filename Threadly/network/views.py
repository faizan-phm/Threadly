from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.db.models import Count
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseBadRequest
from django.shortcuts import render
from django.urls import reverse
from .models import User, Post, Follower, HiddenPost
from django.http import JsonResponse
from django.template.loader import render_to_string


def index(request):
    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 15))
    posts_qs = Post.objects.all().order_by("-time")
    if request.user.is_authenticated:
        hidden_ids = HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True)
        posts_qs = posts_qs.exclude(id__in=hidden_ids)
        following_user_ids = list(Follower.objects.filter(follower=request.user).values_list('user_id', flat=True))
    else:
        following_user_ids = []
    posts = posts_qs[offset:offset+limit]
    return render(request, "network/index.html", {
        "posts": posts,
        "following_user_ids": following_user_ids
    })

def toggle_like(request, post_id):
    liker = request.user
    liked_post = Post.objects.get(id=post_id)
    
    if liker in liked_post.likes.all():
        liked_post.likes.remove(liker)
        liked = False
    else:
        liked_post.likes.add(liker)
        liked = True
    like_count = liked_post.likes.count()
    return  JsonResponse ({
        "liked": liked,
        "like_count": like_count
        
    })

def following(request):
    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 15))
    following_users = Follower.objects.filter(follower=request.user).values_list("user", flat=True)
    posts_qs = Post.objects.filter(author__in=following_users).order_by("-time")
    hidden_ids = HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True)
    posts_qs = posts_qs.exclude(id__in=hidden_ids)
    posts = posts_qs[offset:offset+limit]
    return render(request, "network/following.html", {
        "posts": posts,
        "following_user_ids": list(following_users)
    })

def allposts(request):
    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 15))
    posts_qs = Post.objects.all().order_by("-time")
    if request.user.is_authenticated:
        hidden_ids = HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True)
        posts_qs = posts_qs.exclude(id__in=hidden_ids)
        following_user_ids = list(Follower.objects.filter(follower=request.user).values_list('user_id', flat=True))
    else:
        following_user_ids = []
    posts = posts_qs[offset:offset+limit]
    return render(request, "network/allposts.html", {
        "posts": posts,
        "following_user_ids": following_user_ids
    })




def profile(request, username=None):    
    if username is None:
        username = request.user.username
    
    
    profile_user = User.objects.get(username=username) 
    existing = Follower.objects.filter(user=profile_user, follower=request.user) 
    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 15))
    posts_qs = Post.objects.filter(author__username=username).order_by("-time")
    if request.user.is_authenticated:
        hidden_ids = HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True)
        posts_qs = posts_qs.exclude(id__in=hidden_ids)
        following_user_ids = list(Follower.objects.filter(follower=request.user).values_list('user_id', flat=True))
    else:
        following_user_ids = []
    posts = posts_qs[offset:offset+limit]
    following_count = Follower.objects.filter(follower=profile_user).count()
    followers_count = Follower.objects.filter(user=profile_user).count()
    likes_total = Post.objects.filter(author=profile_user).aggregate(total_likes=Count('likes'))['total_likes'] or 0
    return render(request, "network/profile.html", {
                "posts": posts,
                "existing": existing,
                "profile_user": profile_user,
                "followers_count": followers_count,
                "following_count": following_count,
                "likes_total": likes_total,
                "following_user_ids": following_user_ids
            })

def toggle_follow(request, username):
    viewer = request.user
    user_profile = User.objects.get(username=username)
    existing = Follower.objects.filter(user=user_profile, follower=viewer)
    if existing.exists():
        existing.delete()
        is_following =False
    else:
        Follower.objects.create(user=user_profile, follower=viewer)
        is_following = True
        
    following_count = Follower.objects.filter(follower=user_profile).count()
    followers_count = Follower.objects.filter(user=user_profile).count()
    return JsonResponse ({
        "is_following": is_following,
        "followers_count": followers_count,
        "following_count": following_count
    })
    




def post(request):
    if request.method == "POST":
        content = request.POST.get("content", "")
        author = request.user
        post = Post(content=content, author=author)
        post.save()

        posts = Post.objects.all().order_by("-time")

        
        html = render_to_string("network/partial_posts_list.html", {"posts": posts}, request=request)

        return JsonResponse ({
            "html": html
                             })
    else:
        return HttpResponseBadRequest ("Invlid request method.")
    
def load_posts(request, username=None):
    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 15))

    post_type = request.GET.get("type", "all")   

    if post_type == "following":
        following_users = Follower.objects.filter(follower=request.user).values_list("user", flat=True)
        posts_qs = Post.objects.filter(author__in=following_users).order_by("-time")
        posts_qs = posts_qs.exclude(id__in=HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True))
        posts = posts_qs[offset:offset+limit]
        total = posts_qs.count()

    elif post_type == "profile":
        username = request.GET.get("username", request.user.username)
        profile_user = User.objects.get(username=username) 
        posts_qs = Post.objects.filter(author=profile_user).order_by("-time")
        if request.user.is_authenticated:
            posts_qs = posts_qs.exclude(id__in=HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True))
        posts = posts_qs[offset:offset+limit]
        total = posts_qs.count()

    elif post_type == "likes":
        username = request.GET.get("username", request.user.username)
        profile_user = User.objects.get(username=username)
        posts_qs = Post.objects.filter(likes=profile_user).order_by("-time")
        if request.user.is_authenticated:
            posts_qs = posts_qs.exclude(id__in=HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True))
        posts = posts_qs[offset:offset+limit]
        total = posts_qs.count()

    else: 
        posts_qs = Post.objects.all().order_by("-time")
        if request.user.is_authenticated:
            posts_qs = posts_qs.exclude(id__in=HiddenPost.objects.filter(user=request.user).values_list('post_id', flat=True))
        posts = posts_qs[offset:offset+limit]
        total = posts_qs.count()


    following_user_ids = list(Follower.objects.filter(follower=request.user).values_list('user_id', flat=True)) if request.user.is_authenticated else []
    html = render_to_string("network/partial_posts_list.html", {"posts": posts, "following_user_ids": following_user_ids}, request=request)

    return JsonResponse({
        "html": html,
        "has_more": total > offset + limit
    })

def hide_post(request, post_id):
    if request.method != "POST" or not request.user.is_authenticated:
        return HttpResponseBadRequest("Invalid request")
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return HttpResponseBadRequest("Post not found")
    HiddenPost.objects.get_or_create(user=request.user, post=post)
    return JsonResponse({"hidden": True})

def delete_post(request, post_id):
    if request.method != "POST" or not request.user.is_authenticated:
        return HttpResponseBadRequest("Invalid request")
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return HttpResponseBadRequest("Post not found")
    if post.author != request.user:
        return HttpResponseBadRequest("Not allowed")
    post.delete()
    return JsonResponse({"deleted": True})

def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
