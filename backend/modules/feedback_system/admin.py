from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'rating')
    search_fields = ('product__name', 'user__email', 'comment')
    actions = ['approve_reviews', 'reject_reviews']

    def approve_reviews(self, request, queryset):
        queryset.update(status='APPROVED')
    approve_reviews.short_description = "Approve selected reviews"

    def reject_reviews(self, request, queryset):
        queryset.update(status='REJECTED')
    reject_reviews.short_description = "Reject selected reviews"