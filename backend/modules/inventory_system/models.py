from django.db import models
from django.contrib.postgres.fields import ArrayField

class Product(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    brand = models.CharField(max_length=100, db_index=True)
    category = models.CharField(max_length=100, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    stock = models.PositiveIntegerField()
    low_stock_threshold = models.PositiveIntegerField(default=10)
    sizes = ArrayField(models.CharField(max_length=10), blank=True, null=True)
    colors = ArrayField(models.CharField(max_length=50), blank=True, null=True)
    images = models.JSONField(default=list) # Store list of image URLs

    def __str__(self):
        return self.name

class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='product_images', on_delete=models.CASCADE)
    image_url = models.URLField()

    def __str__(self):
        return f"Image for {self.product.name}"
