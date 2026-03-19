from apis.resources import (
    Register, VerifyAccount, ResendOTP,  Login, ChangePassword , DeleteAccount ,TokenRefresh,
    SparePartsList,
    ReviewsResource, ReviewEditResource, ReviewReactionsResource,
    OrdersResource
)

from apis.admin_resources import (
    CreateAdmin, ListAdmins, DeleteAdmin, AdminOrders
)


def register_routes(api):
    api.add_resource(Register, '/register')
    api.add_resource(VerifyAccount, "/verify-account")
    api.add_resource(ResendOTP, "/resend-otp")
    api.add_resource(Login, '/login')
    api.add_resource(ChangePassword, '/change-password')
    api.add_resource(DeleteAccount, '/delete-account')
    api.add_resource(TokenRefresh, '/refresh')
    api.add_resource(SparePartsList, "/spareparts", "/spareparts/<string:part_id>")
    api.add_resource(ReviewsResource, '/reviews/<string:part_id>')
    api.add_resource(ReviewEditResource, '/reviews/edit/<string:review_id>')
    api.add_resource(ReviewReactionsResource, '/reviews/<string:review_id>/react')
    api.add_resource(OrdersResource, '/orders', '/orders/<string:order_id>')

    # ------------------- Admin Endpoints -------------------------
    api.add_resource(CreateAdmin, '/admin/create-admin')
    api.add_resource(ListAdmins, '/admin/admins')
    api.add_resource(DeleteAdmin, '/admin/delete-admin/<string:admin_id>')  
    api.add_resource(AdminOrders, '/admin/orders', '/admin/orders/<string:order_id>')

