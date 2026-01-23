from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class UserRole(models.TextChoices):
    CUSTOMER = 'CUSTOMER', _('Customer')
    MERCHANT = 'MERCHANT', _('Merchant')
    ADMIN = 'ADMIN', _('Admin')

class User(AbstractUser):
    email = models.EmailField(_('email address'), unique=True)
    full_name = models.CharField(_('full name'), max_length=150, blank=True)
    phone = models.CharField(_('phone number'), max_length=20, blank=True)
    role = models.CharField(
        max_length=10,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

class MerchantProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='merchant_profile'
    )
    business_name = models.CharField(max_length=255)
    is_approved = models.BooleanField(default=False)
    application_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.business_name
