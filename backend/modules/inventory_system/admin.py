from django.contrib import admin
from .models import Product, ProductImage

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand', 'category', 'price', 'stock')
    list_filter = ('brand', 'category')
    search_fields = ('name', 'brand', 'category')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline]

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'image_url')
    list_filter = ('product',)
    search_fields = ('product__name',)