from rest_framework import serializers
from django.contrib.auth.models import User, Permission, Group

class PermissionSerializer(serializers.ModelSerializer): 
    class Meta:
        model = Permission
        fields = ('name', 'codename')

class GroupSerializer(serializers.ModelSerializer): 
    class Meta:
        model = Group
        fields = ('name')

class UserSerializer(serializers.ModelSerializer):
    uid = serializers.IntegerField(source="id")
    userName = serializers.CharField(source="username")
    isActive = serializers.CharField(source="is_active")
    displayname = serializers.SerializerMethodField('get_full_name')
    userPermissions = serializers.SerializerMethodField('get_permissions')
    isStaff = serializers.BooleanField(source="is_staff")

    def get_full_name(self, obj):
        return obj.first_name + " " + obj.last_name
    
    def get_permissions(self, obj):
        if obj.groups.count() > 0:
            group = obj.groups.all()[0]
            permissions = Permission.objects.filter(group=group)
            permission_data = map(lambda p: p.codename, permissions)
            return permission_data
        
        return []
        # return obj.get_group_permissions()

    class Meta:
        model = User
        fields = ('uid', 'userName', 'displayname', 'isActive', 'userPermissions', 'isStaff')
        # fields = "__all__"

