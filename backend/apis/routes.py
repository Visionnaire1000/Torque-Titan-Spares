from apis.resources import (
    Register, Login, TokenRefresh, CreateAdmin,
    SparePartsList,
    ReviewsResource, ReviewReactionsResource,
    Checkout, OrdersResource, AdminOrders
)

def register_routes(api):
    api.add_resource(Register, '/register')
    api.add_resource(Login, '/login')
    api.add_resource(TokenRefresh, '/refresh')
    api.add_resource(CreateAdmin, '/admin/create')
    api.add_resource(SparePartsList, "/spareparts", "/spareparts/<string:part_id>")
    api.add_resource(ReviewsResource, '/reviews/<string:part_id>', '/reviews/edit/<string:review_id>')
    api.add_resource(ReviewReactionsResource, '/reviews/<string:review_id>/react')
    api.add_resource(Checkout, '/checkout')
    api.add_resource(OrdersResource, '/orders', '/orders/<string:order_id>')
    api.add_resource(AdminOrders, '/admin/orders', '/admin/orders/<string:order_id>')

