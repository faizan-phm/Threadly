
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("post/", views.post, name="post"),
    path("allposts/", views.allposts, name="allposts"),
    path("profile/", views.profile, name="profile"),
    path("profile/<str:username>", views.profile, name="userprofile"),
    path("profile/<str:username>/toggle_follow", views.toggle_follow, name="toggle_follow"),
    path("following/", views.following, name="following"),
    path("load_posts/", views.load_posts, name="load_posts"),
    path("like/<int:post_id>/toggle_like", views.toggle_like, name="toggle_like"),
    path("post/<int:post_id>/hide", views.hide_post, name="hide_post"),
    path("post/<int:post_id>/delete", views.delete_post, name="delete_post")
]
