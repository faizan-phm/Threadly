from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    pass

# class threaders(models.Model):
class Follower(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')

    def __str__(self):
        return f"{self.follower.username} followed {self.user.username}"

class Post(models.Model):
    content = models.CharField(max_length=140)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='author')
    time = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name="liker", blank=True)
    
    def like_count(self):
        return self.likes.count()

    def __str__(self):
        return f"Post is made by {self.author.username} on {self.time.strftime('%b %d %Y %H:%M:%S')}"


class HiddenPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hidden_by')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='hidden_post')

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} hid post {self.post.id}"