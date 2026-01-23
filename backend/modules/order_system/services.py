from django.db import transaction
from modules.inventory_system.models import Product
from .models import Order, OrderItem

class OutOfStockException(Exception):
    pass

def create_order_atomic(user, cart_data):
    """
    Creates an order atomically.

    Args:
        user: The user placing the order.
        cart_data: A list of dictionaries, where each dictionary represents a cart item.
                   Example: [{'product_id': 1, 'quantity': 2, 'size': '42', 'color': 'Black'}, ...]

    Returns:
        The created Order object.

    Raises:
        OutOfStockException: If any of the products in the cart are out of stock.
    """
    with transaction.atomic():
        # Lock the product rows to prevent race conditions
        product_ids = [item['product_id'] for item in cart_data]
        products = Product.objects.select_for_update().filter(id__in=product_ids)
        
        product_map = {product.id: product for product in products}

        total_amount = 0
        order_items_to_create = []

        for item in cart_data:
            product = product_map.get(item['product_id'])
            if not product or product.stock < item['quantity']:
                raise OutOfStockException(f"Product '{product.name if product else 'N/A'}' is out of stock.")

            # Decrement stock
            product.stock -= item['quantity']
            
            # Calculate total amount
            total_amount += product.price * item['quantity']

            order_items_to_create.append(
                OrderItem(
                    product_name=product.name,
                    price=product.price,
                    selected_size=item['size'],
                    selected_color=item['color'],
                    quantity=item['quantity'],
                )
            )

        # Bulk update product stock
        Product.objects.bulk_update(products, ['stock'])

        # Create the order
        order = Order.objects.create(
            customer=user,
            shipping_address="Placeholder Address", # This should come from user profile or request
            total_amount=total_amount,
        )

        # Set the order for the order items
        for item in order_items_to_create:
            item.order = order

        # Bulk create order items
        OrderItem.objects.bulk_create(order_items_to_create)

        return order