from django.contrib import admin
from .models import User, MerchantProfile

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    search_fields = ('email', 'full_name')

@admin.register(MerchantProfile)
class MerchantProfileAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'user', 'is_approved', 'application_date')
    list_filter = ('is_approved',)
    search_fields = ('business_name', 'user__email')