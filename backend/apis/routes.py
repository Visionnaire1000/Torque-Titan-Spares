from apis.resources import (
    Register, Login, CreateAdmin,
    SparePartsList, SpareParts,
    Reviews, ReviewReactions,
    Checkout, Orders, AdminOrders
)

def register_routes(api):
    api.add_resource(Register, '/register')
    api.add_resource(Login, '/login')
    api.add_resource(CreateAdmin, '/admin/create')
    api.add_resource(SparePartsList, '/spareparts')
    api.add_resource(SpareParts, '/spareparts/<string:part_id>')
    api.add_resource(Reviews, '/reviews/<string:part_id>', '/reviews/edit/<string:review_id>')
    api.add_resource(ReviewReactions, '/reviews/<string:review_id>/react')
    api.add_resource(Checkout, '/checkout')
    api.add_resource(Orders, '/orders', '/orders/<string:order_id>')
    api.add_resource(AdminOrders, '/admin/orders', '/admin/orders/<string:order_id>')

